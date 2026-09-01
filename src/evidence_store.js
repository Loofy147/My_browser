const { openDB, allRuns } = require("./db");
const { createExecution, createObservation, createEvidence, createVerification, createProvenance, sha256Canonical } = require("./contracts");

function tableColumns(db, tableName) {
  return new Set(db.prepare(`PRAGMA table_info(${tableName})`).all().map((row) => row.name));
}

function ensureColumn(db, tableName, columnName, definition) {
  if (!tableColumns(db, tableName).has(columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function ensureEvidenceSchema(db) {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS executions (
      execution_id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      adapter TEXT NOT NULL,
      started_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS observations (
      observation_id TEXT PRIMARY KEY,
      execution_id TEXT NOT NULL,
      step TEXT NOT NULL,
      data TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      FOREIGN KEY (execution_id) REFERENCES executions(execution_id)
    );
    CREATE TABLE IF NOT EXISTS evidence (
      evidence_id TEXT PRIMARY KEY,
      observation_id TEXT NOT NULL,
      execution_id TEXT NOT NULL,
      source_uri TEXT,
      retrieval_method TEXT,
      artifact_hash TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      UNIQUE(observation_id, artifact_hash),
      FOREIGN KEY (observation_id) REFERENCES observations(observation_id),
      FOREIGN KEY (execution_id) REFERENCES executions(execution_id)
    );
    CREATE TABLE IF NOT EXISTS verifications (
      verification_id TEXT PRIMARY KEY,
      evidence_id TEXT NOT NULL,
      method TEXT NOT NULL,
      outcome TEXT NOT NULL,
      verified_at TEXT NOT NULL,
      verifier TEXT NOT NULL,
      FOREIGN KEY (evidence_id) REFERENCES evidence(evidence_id)
    );
    CREATE TABLE IF NOT EXISTS evidence_provenance (
      evidence_id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      source_uri TEXT,
      retrieved_at TEXT NOT NULL,
      adapter_id TEXT NOT NULL,
      adapter_version TEXT NOT NULL,
      code_revision TEXT,
      environment_digest TEXT,
      request_id TEXT,
      raw_artifact_ref TEXT,
      transform_id TEXT,
      FOREIGN KEY (evidence_id) REFERENCES evidence(evidence_id)
    );
    CREATE TABLE IF NOT EXISTS evidence_relations (
      evidence_id TEXT NOT NULL,
      relation TEXT NOT NULL,
      related_evidence_id TEXT NOT NULL,
      PRIMARY KEY (evidence_id, relation, related_evidence_id),
      FOREIGN KEY (evidence_id) REFERENCES evidence(evidence_id),
      FOREIGN KEY (related_evidence_id) REFERENCES evidence(evidence_id)
    );
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Additive migrations for databases created before schema v3.
  ensureColumn(db, "executions", "request_id", "TEXT");
  ensureColumn(db, "executions", "code_revision", "TEXT");
  ensureColumn(db, "executions", "environment_digest", "TEXT");
  ensureColumn(db, "evidence", "parent_evidence_id", "TEXT");

  db.prepare("INSERT OR REPLACE INTO schema_meta(key,value) VALUES('canonical_schema_version',?)").run("3");
}

function withTransaction(db, work) {
  db.exec("BEGIN");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch {}
    throw error;
  }
}

function persistEvidenceBundle(db, { execution, observation, evidence, verification = null, provenance = null, relations = [] }) {
  if (execution.execution_id !== observation.execution_id || observation.observation_id !== evidence.observation_id || observation.execution_id !== evidence.execution_id) {
    throw new Error("Evidence bundle relationship invariants violated");
  }
  if (verification && verification.evidence_id !== evidence.evidence_id) {
    throw new Error("Verification must reference the persisted evidence");
  }
  if (provenance && provenance.evidence_id !== evidence.evidence_id) {
    throw new Error("Provenance must reference the persisted evidence");
  }

  return withTransaction(db, () => {
    db.prepare("INSERT OR IGNORE INTO executions(execution_id,source,adapter,started_at,request_id,code_revision,environment_digest) VALUES(?,?,?,?,?,?,?)")
      .run(execution.execution_id, execution.source, execution.adapter, execution.started_at, execution.request_id, execution.code_revision, execution.environment_digest);
    db.prepare("INSERT OR IGNORE INTO observations(observation_id,execution_id,step,data,observed_at) VALUES(?,?,?,?,?)")
      .run(observation.observation_id, observation.execution_id, observation.step, JSON.stringify(observation.data), observation.observed_at);
    db.prepare("INSERT OR IGNORE INTO evidence(evidence_id,observation_id,execution_id,source_uri,retrieval_method,artifact_hash,captured_at,parent_evidence_id) VALUES(?,?,?,?,?,?,?,?)")
      .run(evidence.evidence_id, evidence.observation_id, evidence.execution_id, evidence.source_uri, evidence.retrieval_method, evidence.artifact_hash, evidence.captured_at, evidence.parent_evidence_id);
    if (provenance) {
      db.prepare("INSERT OR IGNORE INTO evidence_provenance(evidence_id,source_id,source_uri,retrieved_at,adapter_id,adapter_version,code_revision,environment_digest,request_id,raw_artifact_ref,transform_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
        .run(provenance.evidence_id, provenance.source_id, provenance.source_uri, provenance.retrieved_at, provenance.adapter_id, provenance.adapter_version, provenance.code_revision, provenance.environment_digest, provenance.request_id, provenance.raw_artifact_ref, provenance.transform_id);
    }
    if (verification) {
      db.prepare("INSERT OR IGNORE INTO verifications(verification_id,evidence_id,method,outcome,verified_at,verifier) VALUES(?,?,?,?,?,?)")
        .run(verification.verification_id, verification.evidence_id, verification.method, verification.outcome, verification.verified_at, verification.verifier);
    }
    for (const relation of relations) {
      if (!relation || typeof relation !== "object") throw new TypeError("relation must be an object");
      if (relation.evidenceId !== evidence.evidence_id) throw new Error("Relation source must be the persisted evidence");
      if (!["supersedes", "derived_from", "same_subject", "supports", "contradicts"].includes(relation.relation)) throw new TypeError("unsupported evidence relation");
      db.prepare("INSERT OR IGNORE INTO evidence_relations(evidence_id,relation,related_evidence_id) VALUES(?,?,?)")
        .run(relation.evidenceId, relation.relation, relation.relatedEvidenceId);
    }
    return { execution, observation, evidence, verification, provenance, relations };
  });
}

function persistRecord(db, { executionId, source, adapter, adapterVersion = "unknown", step, data, sourceUri = null, sourceId = source, retrievalMethod = null, verification = null, observedAt, requestId = null, codeRevision = null, environmentDigest = null, rawArtifactRef = null, transformId = null, parentEvidenceId = null, relations = [] }) {
  const execution = createExecution({ executionId, source, adapter, startedAt: observedAt, requestId, codeRevision, environmentDigest });
  const artifactHash = sha256Canonical(data);
  const observation = createObservation({ executionId, step, data, observedAt });
  const evidence = createEvidence({ observation, sourceUri, retrievalMethod, parentEvidenceId });

  let normalizedVerification = null;
  if (verification) {
    normalizedVerification = createVerification({
      verificationId: verification.verificationId,
      evidenceId: evidence.evidence_id,
      method: verification.method,
      outcome: verification.outcome,
      verifier: verification.verifier,
      verifiedAt: verification.verifiedAt || observedAt
    });
  }

  const provenance = createProvenance({
    evidenceId: evidence.evidence_id,
    sourceId,
    sourceUri,
    retrievedAt: observedAt || evidence.captured_at,
    adapterId: adapter,
    adapterVersion,
    codeRevision,
    environmentDigest,
    requestId,
    rawArtifactRef,
    transformId
  });

  if (artifactHash !== evidence.artifact_hash.slice("sha256:".length)) {
    throw new Error("Evidence artifact hash mismatch");
  }
  return persistEvidenceBundle(db, { execution, observation, evidence, verification: normalizedVerification, provenance, relations });
}

function migrateLegacyRuns(db) {
  ensureEvidenceSchema(db);
  const legacy = allRuns(db);
  for (const row of legacy) {
    persistRecord(db, {
      executionId: "legacy:" + row.run_label + ":" + row.source,
      source: row.source,
      adapter: "legacy-db",
      step: row.step,
      data: row.result,
      retrievalMethod: "legacy-migration",
      observedAt: row.created_at ? new Date(row.created_at.replace(" ", "T") + "Z").toISOString() : undefined
    });
  }
  return legacy.length;
}

function openEvidenceDB(filePath = ":memory:") {
  const db = openDB(filePath);
  ensureEvidenceSchema(db);
  migrateLegacyRuns(db);
  return db;
}

module.exports = { openEvidenceDB, ensureEvidenceSchema, persistEvidenceBundle, persistRecord, migrateLegacyRuns };