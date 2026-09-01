const crypto = require("node:crypto");

const SCHEMA_VERSION = 1;

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(name + " must be a non-empty string");
  }
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  return "{" + Object.keys(value).sort().map((key) =>
    JSON.stringify(key) + ":" + canonicalize(value[key])
  ).join(",") + "}";
}

function sha256Canonical(value) {
  return crypto.createHash("sha256").update(canonicalize(value)).digest("hex");
}

function createExecution({ executionId, source, adapter, startedAt = new Date().toISOString() }) {
  assertNonEmptyString(executionId, "executionId");
  assertNonEmptyString(source, "source");
  assertNonEmptyString(adapter, "adapter");
  return {
    schema_version: SCHEMA_VERSION,
    execution_id: executionId,
    source,
    adapter,
    started_at: startedAt,
  };
}

function createObservation({ observationId, executionId, step, data, observedAt = new Date().toISOString() }) {
  assertNonEmptyString(observationId, "observationId");
  assertNonEmptyString(executionId, "executionId");
  assertNonEmptyString(step, "step");
  return {
    schema_version: SCHEMA_VERSION,
    observation_id: observationId,
    execution_id: executionId,
    step,
    data,
    observed_at: observedAt,
  };
}

function createEvidence({ evidenceId, observation, sourceUri = null, retrievalMethod = null }) {
  assertNonEmptyString(evidenceId, "evidenceId");
  if (!observation || typeof observation !== "object") {
    throw new TypeError("observation must be an object");
  }
  const artifactHash = sha256Canonical(observation.data);
  return {
    schema_version: SCHEMA_VERSION,
    evidence_id: evidenceId,
    observation_id: observation.observation_id,
    execution_id: observation.execution_id,
    source_uri: sourceUri,
    retrieval_method: retrievalMethod,
    artifact_hash: "sha256:" + artifactHash,
    captured_at: observation.observed_at,
  };
}

function createVerification({ verificationId, evidenceId, method, outcome, verifiedAt = new Date().toISOString(), verifier = "system" }) {
  assertNonEmptyString(verificationId, "verificationId");
  assertNonEmptyString(evidenceId, "evidenceId");
  assertNonEmptyString(method, "method");
  if (!["pass", "fail", "inconclusive"].includes(outcome)) {
    throw new TypeError("outcome must be pass, fail, or inconclusive");
  }
  return {
    schema_version: SCHEMA_VERSION,
    verification_id: verificationId,
    evidence_id: evidenceId,
    method,
    outcome,
    verified_at: verifiedAt,
    verifier,
  };
}

module.exports = {
  SCHEMA_VERSION,
  canonicalize,
  sha256Canonical,
  createExecution,
  createObservation,
  createEvidence,
  createVerification,
};
