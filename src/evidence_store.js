const { openDB, allRuns } = require("./db");
const { createExecution, createObservation, createEvidence, createVerification, sha256Canonical } = require("./contracts");

function ensureEvidenceSchema(db) {
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
  `);
}

function persistEvidenceBundle(db,{execution,observation,evidence,verification=null}) {
  db.exec("BEGIN");
  try {
    db.prepare("INSERT OR IGNORE INTO executions(execution_id,source,adapter,started_at) VALUES(?,?,?,?)")
      .run(execution.execution_id,execution.source,execution.adapter,execution.started_at);
    db.prepare("INSERT OR IGNORE INTO observations(observation_id,execution_id,step,data,observed_at) VALUES(?,?,?,?,?)")
      .run(observation.observation_id,observation.execution_id,observation.step,JSON.stringify(observation.data),observation.observed_at);
    db.prepare("INSERT OR IGNORE INTO evidence(evidence_id,observation_id,execution_id,source_uri,retrieval_method,artifact_hash,captured_at) VALUES(?,?,?,?,?,?,?)")
      .run(evidence.evidence_id,evidence.observation_id,evidence.execution_id,evidence.source_uri,evidence.retrieval_method,evidence.artifact_hash,evidence.captured_at);
    if(verification){
      db.prepare("INSERT OR IGNORE INTO verifications(verification_id,evidence_id,method,outcome,verified_at,verifier) VALUES(?,?,?,?,?,?)")
        .run(verification.verification_id,verification.evidence_id,verification.method,verification.outcome,verification.verified_at,verification.verifier);
    }
    db.exec("COMMIT");
  }catch(error){db.exec("ROLLBACK");throw error;}
}

function persistRecord(db,{executionId,source,adapter,step,data,sourceUri=null,retrievalMethod=null,verification=null,observedAt}){
  const execution=createExecution({executionId,source,adapter,startedAt:observedAt});
  const artifactHash=sha256Canonical(data);
  const observation=createObservation({
    observationId:"obs:"+executionId+":"+step+":"+artifactHash,
    executionId,step,data,observedAt
  });
  const evidence=createEvidence({
    evidenceId:"ev:"+executionId+":"+step+":"+artifactHash,
    observation,sourceUri,retrievalMethod
  });

  let normalizedVerification=null;
  if(verification){
    normalizedVerification=createVerification({
      verificationId:verification.verificationId||"ver:"+evidence.evidence_id,
      evidenceId:evidence.evidence_id,
      method:verification.method,
      outcome:verification.outcome,
      verifier:verification.verifier,
      verifiedAt:verification.verifiedAt||observedAt
    });
  }

  persistEvidenceBundle(db,{execution,observation,evidence,verification:normalizedVerification});
  return {execution,observation,evidence,verification:normalizedVerification};
}

function migrateLegacyRuns(db){
  ensureEvidenceSchema(db);
  const legacy=allRuns(db);
  for(const row of legacy){
    persistRecord(db,{
      executionId:"legacy:"+row.run_label+":"+row.source,
      source:row.source,
      adapter:"legacy-db",
      step:row.step,
      data:row.result,
      retrievalMethod:"legacy-migration",
      observedAt:row.created_at ? new Date(row.created_at.replace(" ","T")+"Z").toISOString() : undefined
    });
  }
  return legacy.length;
}

function openEvidenceDB(filePath=":memory:"){
  const db=openDB(filePath);
  ensureEvidenceSchema(db);
  migrateLegacyRuns(db);
  return db;
}

module.exports={openEvidenceDB,ensureEvidenceSchema,persistEvidenceBundle,persistRecord,migrateLegacyRuns};