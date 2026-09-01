const test = require("node:test");
const assert = require("node:assert/strict");
const { canonicalize, sha256Canonical, createExecution, createObservation, createEvidence, createVerification } = require("../src/contracts");

test("canonicalization is key-order independent", () => {
  assert.equal(canonicalize({ b: 2, a: 1 }), canonicalize({ a: 1, b: 2 }));
  assert.equal(sha256Canonical({ b: 2, a: 1 }), sha256Canonical({ a: 1, b: 2 }));
});

test("evidence bundle separates execution, observation, evidence and verification", () => {
  const execution = createExecution({ executionId: "exec-1", source: "fixture", adapter: "dom" });
  const observation = createObservation({ executionId: execution.execution_id, step: "row-1", data: { value: 42 } });
  const evidence = createEvidence({ observation, sourceUri: "fixture://row-1", retrievalMethod: "dom-extraction" });
  const verification = createVerification({ evidenceId: evidence.evidence_id, method: "independent-readback", outcome: "pass" });

  assert.equal(evidence.observation_id, observation.observation_id);
  assert.match(evidence.artifact_hash, /^sha256:[0-9a-f]{64}$/);
  assert.match(evidence.evidence_id, /^ev:[0-9a-f]{64}$/);
  assert.equal(verification.evidence_id, evidence.evidence_id);
});
