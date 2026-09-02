const test = require("node:test");
const assert = require("node:assert/strict");
const { openEvidenceDB, persistRecord } = require("../src/evidence_store");
const { sha256Canonical, createObservation, createEvidence } = require("../src/contracts");
const { sha256Bytes } = require("../src/artifact_store");
const { webAdapter, pdfAdapter, githubAdapter } = require("../src/source_adapters");

async function persistAdapterResult(db, executionId, result, adapter, extra = {}) {
  return persistRecord(db, {
    executionId,
    source: result.source,
    adapter: adapter.id,
    adapterVersion: adapter.version,
    step: result.step,
    data: result.data,
    sourceUri: result.source_uri,
    retrievalMethod: result.retrieval_method,
    observedAt: "2026-09-01T00:00:00.000Z",
    ...extra,
  });
}

test("all three source adapters emit the same semantic shape", async () => {
  const common = { subject_id: "company-42", claim_type: "status", value: "active" };
  const web = await webAdapter.acquire({
    html: `<div data-subject-id="${common.subject_id}" data-claim-type="${common.claim_type}">${common.value}</div>`,
    sourceUri: "https://example.test/company-42"
  });
  const pdf = await pdfAdapter.acquire({
    text: common.value,
    subjectId: common.subject_id,
    claimType: common.claim_type,
    sourceUri: "file:///evidence/company-42.pdf"
  });
  const github = await githubAdapter.acquire({
    response: common,
    path: "data/company-42.json",
    sourceUri: "https://api.github.com/repos/example/project/contents/data/company-42.json"
  });

  assert.deepEqual(web.data, pdf.data);
  assert.deepEqual(pdf.data, github.data);
  assert.notEqual(web.source_uri, pdf.source_uri);
  assert.notEqual(pdf.source_uri, github.source_uri);
});

test("canonical identity is enforced rather than caller-selected", () => {
  const observation = createObservation({ executionId: "exec-1", step: "step-1", data: { a: 1 } });
  const evidence = createEvidence({ observation });
  assert.match(observation.observation_id, /^obs:[0-9a-f]{64}$/);
  assert.match(evidence.evidence_id, /^ev:[0-9a-f]{64}$/);
  assert.throws(
    () => createEvidence({ observation, evidenceId: "ev:caller-chosen" }),
    /does not match canonical evidence identity/
  );
});

test("same semantic content is stable and changed content is detectable", async () => {
  const db = openEvidenceDB(":memory:");
  try {
    const webA = await webAdapter.acquire({ html: '<div data-subject-id="company-42" data-claim-type="status">active</div>' });
    const pdfA = await pdfAdapter.acquire({ text: "active", subjectId: "company-42", claimType: "status" });
    const githubA = await githubAdapter.acquire({ response: { subject_id: "company-42", claim_type: "status", value: "active" }, path: "company-42.json" });

    const r1 = await persistAdapterResult(db, "web-exec", webA, webAdapter);
    const r2 = await persistAdapterResult(db, "pdf-exec", pdfA, pdfAdapter);
    const r3 = await persistAdapterResult(db, "github-exec", githubA, githubAdapter);

    assert.equal(r1.evidence.artifact_hash, r2.evidence.artifact_hash);
    assert.equal(r2.evidence.artifact_hash, r3.evidence.artifact_hash);
    assert.notEqual(r1.evidence.evidence_id, r2.evidence.evidence_id, "execution context is part of evidence identity");

    const webChanged = await webAdapter.acquire({ html: '<div data-subject-id="company-42" data-claim-type="status">suspended</div>' });
    const changed = await persistAdapterResult(db, "web-exec", webChanged, webAdapter, { parentEvidenceId: r1.evidence.evidence_id });
    assert.notEqual(changed.evidence.artifact_hash, r1.evidence.artifact_hash);
    assert.notEqual(changed.evidence.evidence_id, r1.evidence.evidence_id);

    db.prepare("INSERT INTO evidence_relations(evidence_id,relation,related_evidence_id) VALUES(?,?,?)")
      .run(changed.evidence.evidence_id, "supersedes", r1.evidence.evidence_id);
    assert.equal(db.prepare("SELECT relation FROM evidence_relations WHERE evidence_id=?").get(changed.evidence.evidence_id).relation, "supersedes");
  } finally {
    db.close();
  }
});

test("provenance captures adapter identity and execution context", async () => {
  const db = openEvidenceDB(":memory:");
  try {
    const web = await webAdapter.acquire({ html: '<div data-subject-id="company-42" data-claim-type="status">active</div>', sourceUri: "https://example.test/company-42" });
    const raw = "<div data-subject-id=\"company-42\" data-claim-type=\"status\">active</div>";
    const result = await persistAdapterResult(db, "prov-exec", web, webAdapter, {
      requestId: "req-42",
      codeRevision: "git:abc123",
      environmentDigest: "sha256:env",
      rawArtifact: raw,
      rawMediaType: "text/html",
      transformId: "web-semantic-v1"
    });
    const row = db.prepare("SELECT * FROM evidence_provenance WHERE evidence_id=?").get(result.evidence.evidence_id);
    assert.equal(row.adapter_id, webAdapter.id);
    assert.equal(row.adapter_version, webAdapter.version);
    assert.equal(row.request_id, "req-42");
    assert.equal(row.raw_artifact_ref, sha256Bytes(Buffer.from(raw, "utf8")));
    assert.equal(row.transform_id, "web-semantic-v1");
  } finally {
    db.close();
  }
});

test("foreign keys reject orphaned observations", () => {
  const db = openEvidenceDB(":memory:");
  try {
    assert.throws(() => db.prepare("INSERT INTO observations(observation_id,execution_id,step,data,observed_at) VALUES(?,?,?,?,?)").run("orphan", "missing", "x", "{}", "2026-09-01T00:00:00.000Z"));
  } finally {
    db.close();
  }
});

test("canonical hashing rejects unsupported values instead of silently serializing them", () => {
  assert.throws(() => sha256Canonical({ bad: undefined }), /does not support value type: undefined/);
  assert.throws(() => sha256Canonical({ bad: Infinity }), /non-finite numbers/);
});
