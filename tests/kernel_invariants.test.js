const test = require("node:test");
const assert = require("node:assert/strict");
const { openEvidenceDB } = require("../src/evidence_store");
const { persistAdapterResult } = require("../src/adapters");
const { webAdapter } = require("../src/source_adapters");
const { sha256Bytes } = require("../src/artifact_store");

/* Existing repository test content retained; only the provenance assertion below is aligned with content-addressed raw artifacts. */

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
