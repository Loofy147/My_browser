const test = require("node:test");
const assert = require("node:assert/strict");

const { webAdapter, pdfAdapter, githubAdapter } = require("../src/source_adapters");
const { openEvidenceDB, persistRecord } = require("../src/evidence_store");
const { sha256Canonical, replayEvidenceIdentity } = require("../src/contracts");

const observedAt = "2026-09-01T00:00:00.000Z";
const semanticData = {
  subject_id: "entity-1",
  claim_type: "status",
  value: "approved",
};

function persistAdapterObservation(db, executionId, observation, adapter) {
  return persistRecord(db, {
    executionId,
    source: observation.source,
    adapter: adapter.id,
    adapterVersion: adapter.version,
    step: observation.step,
    data: observation.data,
    sourceUri: observation.source_uri,
    sourceId: observation.source + ":entity-1",
    retrievalMethod: observation.retrieval_method,
    observedAt,
    codeRevision: "test-revision",
    environmentDigest: "test-environment",
    requestId: executionId,
    rawArtifact: observation.source === "web" ? "<span data-subject-id=\"entity-1\" data-claim-type=\"status\">approved</span>" : observation.source === "pdf" ? "approved" : JSON.stringify({subject_id:"entity-1",claim_type:"status",value:"approved"}),
    rawMediaType: observation.source === "web" ? "text/html" : "text/plain",
    transformId: "semantic-normalization:v1",
  });
}

test("cross-adapter evidence lifecycle preserves semantic identity while separating execution provenance", async () => {
  const web = await webAdapter.acquire({
    html: '<span data-subject-id="entity-1" data-claim-type="status">approved</span>',
    sourceUri: "https://example.test/entity-1",
  });
  const pdf = await pdfAdapter.acquire({
    text: "approved",
    subjectId: "entity-1",
    claimType: "status",
    sourceUri: "file://entity-1.pdf",
  });
  const github = await githubAdapter.acquire({
    response: {
      subject_id: "entity-1",
      claim_type: "status",
      value: "approved",
    },
    path: "body.status",
    sourceUri: "github://example/entity-1",
  });

  assert.deepEqual(web.data, semanticData);
  assert.deepEqual(pdf.data, semanticData);
  assert.deepEqual(github.data, semanticData);

  assert.equal(sha256Canonical(web.data), sha256Canonical(pdf.data));
  assert.equal(sha256Canonical(pdf.data), sha256Canonical(github.data));

  const db = openEvidenceDB();
  try {
    const webBundle = persistAdapterObservation(db, "exec-web", web, webAdapter);
    const pdfBundle = persistAdapterObservation(db, "exec-pdf", pdf, pdfAdapter);
    const githubBundle = persistAdapterObservation(db, "exec-github", github, githubAdapter);

    assert.equal(webBundle.evidence.artifact_hash, pdfBundle.evidence.artifact_hash);
    assert.equal(pdfBundle.evidence.artifact_hash, githubBundle.evidence.artifact_hash);

    assert.notEqual(webBundle.evidence.evidence_id, pdfBundle.evidence.evidence_id);
    assert.notEqual(pdfBundle.evidence.evidence_id, githubBundle.evidence.evidence_id);
    assert.notEqual(webBundle.evidence.evidence_id, githubBundle.evidence.evidence_id);

    const verified = persistRecord(db, {
      executionId: "exec-web",
      source: web.source,
      adapter: webAdapter.id,
      adapterVersion: webAdapter.version,
      step: web.step,
      data: web.data,
      sourceUri: web.source_uri,
      retrievalMethod: web.retrieval_method,
      observedAt,
      verification: {
        method: "cross-adapter-independent-check",
        outcome: "pass",
        verifier: "test",
      },
    });

    assert.equal(verified.evidence.evidence_id, webBundle.evidence.evidence_id);
    assert.equal(db.prepare("SELECT count(*) AS n FROM verifications WHERE evidence_id = ?").get(webBundle.evidence.evidence_id).n, 1);

    const replay = persistAdapterObservation(db, "exec-web", web, webAdapter);
    assert.equal(replay.evidence.evidence_id, webBundle.evidence.evidence_id);
    assert.equal(db.prepare("SELECT count(*) AS n FROM evidence WHERE evidence_id = ?").get(webBundle.evidence.evidence_id).n, 1);

    const mutated = await webAdapter.acquire({
      html: '<span data-subject-id="entity-1" data-claim-type="status">rejected</span>',
      sourceUri: "https://example.test/entity-1",
    });
    const mutatedBundle = persistAdapterObservation(db, "exec-web", mutated, webAdapter);

    assert.notEqual(mutatedBundle.evidence.artifact_hash, webBundle.evidence.artifact_hash);
    assert.notEqual(mutatedBundle.evidence.evidence_id, webBundle.evidence.evidence_id);
    assert.equal(replayEvidenceIdentity({ executionId: "exec-web", step: web.step, data: web.data }), webBundle.evidence.evidence_id);
    assert.equal(db.prepare("SELECT count(*) AS n FROM verifications WHERE evidence_id = ?").get(mutatedBundle.evidence.evidence_id).n, 0);

    const originalRow = db.prepare("SELECT artifact_hash, source_uri FROM evidence WHERE evidence_id = ?").get(webBundle.evidence.evidence_id);
    assert.equal(originalRow.artifact_hash, webBundle.evidence.artifact_hash);
    assert.equal(originalRow.source_uri, "https://example.test/entity-1");

    const provenance = db.prepare("SELECT adapter_id, adapter_version, code_revision, environment_digest, request_id, raw_artifact_ref, transform_id FROM evidence_provenance WHERE evidence_id = ?").get(webBundle.evidence.evidence_id);
    assert.equal(provenance.adapter_id, "web-dom");
    assert.equal(provenance.adapter_version, "0.1.0");
    assert.equal(provenance.code_revision, "test-revision");
    assert.equal(provenance.environment_digest, "test-environment");
    assert.equal(provenance.request_id, "exec-web");
    assert.match(provenance.raw_artifact_ref, /^sha256:[0-9a-f]{64}$/);
    assert.equal(provenance.transform_id, "semantic-normalization:v1");
    const raw = db.prepare("SELECT artifact_ref, byte_length FROM raw_artifacts WHERE artifact_ref = ?").get(provenance.raw_artifact_ref);
    assert.equal(raw.artifact_ref, provenance.raw_artifact_ref);
    assert.equal(raw.byte_length > 0, true);
    const transform = db.prepare("SELECT transform_id, transform_version, input_artifact_ref, output_evidence_id FROM evidence_transforms WHERE output_evidence_id = ?").get(webBundle.evidence.evidence_id);
    assert.equal(transform.transform_id, "semantic-normalization:v1");
    assert.equal(transform.input_artifact_ref, provenance.raw_artifact_ref);
    assert.equal(transform.output_evidence_id, webBundle.evidence.evidence_id);
  } finally {
    db.close();
  }
});
