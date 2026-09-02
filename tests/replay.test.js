const test = require("node:test"), assert = require("node:assert/strict");
const { createTransform, replayTransform } = require("../src/transforms");
const { openEvidenceDB, persistRecord } = require("../src/evidence_store");
const { getRawArtifact } = require("../src/artifact_store");
const { replayEvidenceIdentity } = require("../src/contracts");

test("raw to transform to evidence to replay is deterministic", () => {
  const raw = Buffer.from("STATUS: approved\n", "utf8");
  const transform = createTransform({
    transformId: "status-v1",
    version: "1",
    apply: (bytes) => {
      const [key, value] = bytes.toString("utf8").trim().split(":").map(x => x.trim());
      return { subject_id: "entity-1", claim_type: key.toLowerCase(), value };
    }
  });
  const first = replayTransform(transform, raw), second = replayTransform(transform, Buffer.from(raw));
  assert.equal(first.raw_artifact_hash, second.raw_artifact_hash);
  assert.equal(first.artifact_hash, second.artifact_hash);
  assert.deepEqual(first.data, second.data);

  const db = openEvidenceDB();
  try {
    const bundle = persistRecord(db, {
      executionId: "replay-exec",
      source: "fixture",
      adapter: "transform-test",
      adapterVersion: "1",
      step: "status",
      data: first.data,
      observedAt: "2026-09-01T00:00:00.000Z",
      rawArtifact: raw,
      rawMediaType: "text/plain",
      transformId: transform.id
    });
    assert.equal(bundle.evidence.artifact_hash, "sha256:" + first.artifact_hash);
    const rawRow = getRawArtifact(db, bundle.provenance.raw_artifact_ref);
    const replayed = replayTransform(transform, rawRow.content);
    assert.equal(replayed.artifact_hash, first.artifact_hash);
    assert.equal(replayEvidenceIdentity({ executionId: "replay-exec", step: "status", data: replayed.data }), bundle.evidence.evidence_id);
    const lineage = db.prepare("SELECT input_artifact_ref,transform_id,transform_version,output_evidence_id FROM evidence_transforms WHERE output_evidence_id=?").get(bundle.evidence.evidence_id);
    assert.equal(lineage.input_artifact_ref, bundle.provenance.raw_artifact_ref);
    assert.equal(lineage.transform_id, "status-v1");
    assert.equal(lineage.transform_version, "1");
  } finally {
    db.close();
  }
});

test("transform mutation produces a different normalized artifact", () => {
  const raw = Buffer.from("STATUS: approved\n", "utf8");
  const a = createTransform({ transformId: "status", version: "1", apply: bytes => ({ value: bytes.toString("utf8").trim().split(":")[1].trim().toLowerCase() }) });
  const b = createTransform({ transformId: "status", version: "2", apply: bytes => ({ value: bytes.toString("utf8").trim().split(":")[1].trim().toUpperCase() }) });
  assert.notEqual(replayTransform(a, raw).artifact_hash, replayTransform(b, raw).artifact_hash);
});
