const test = require("node:test");
const assert = require("node:assert/strict");
const { openEvidenceDB, persistRecord } = require("../src/evidence_store");

test("evidence persistence is transactional and idempotent", () => {
  const db = openEvidenceDB();
  const bundle = {
    executionId: "exec-1",
    source: "fixture",
    adapter: "dom",
    step: "row-1",
    data: { Name: "Item A", Score: "91" },
    sourceUri: "fixture://data_table",
    retrievalMethod: "table-extraction",
    verification: {
      verificationId: "ver-1",
      method: "independent-readback",
      outcome: "pass",
      verifier: "test",
    },
  };

  persistRecord(db, bundle);
  persistRecord(db, bundle);

  assert.equal(db.prepare("SELECT count(*) AS n FROM executions").get().n, 1);
  assert.equal(db.prepare("SELECT count(*) AS n FROM observations").get().n, 1);
  assert.equal(db.prepare("SELECT count(*) AS n FROM evidence").get().n, 1);
  assert.equal(db.prepare("SELECT count(*) AS n FROM verifications").get().n, 1);
  db.close();
});
