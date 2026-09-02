const crypto = require("node:crypto");

const SCHEMA_VERSION = 3;

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(name + " must be a non-empty string");
  }
}

function canonicalize(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new TypeError("canonicalization does not support non-finite numbers");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  if (typeof value === "object") {
    return "{" + Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ":" + canonicalize(value[key])
    ).join(",") + "}";
  }
  throw new TypeError("canonicalization does not support value type: " + typeof value);
}

function sha256Canonical(value) {
  return crypto.createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
}

function createExecution({ executionId, source, adapter, startedAt = new Date().toISOString(), requestId = null, codeRevision = null, environmentDigest = null }) {
  assertNonEmptyString(executionId, "executionId");
  assertNonEmptyString(source, "source");
  assertNonEmptyString(adapter, "adapter");
  return {
    schema_version: SCHEMA_VERSION,
    execution_id: executionId,
    source,
    adapter,
    started_at: startedAt,
    request_id: requestId,
    code_revision: codeRevision,
    environment_digest: environmentDigest,
  };
}

function createObservation({ executionId, step, data, observedAt = new Date().toISOString(), observationId }) {
  assertNonEmptyString(executionId, "executionId");
  assertNonEmptyString(step, "step");
  const artifactHash = sha256Canonical(data);
  const expectedId = "obs:" + sha256Canonical({ execution_id: executionId, step, artifact_hash: artifactHash });
  if (observationId !== undefined && observationId !== expectedId) {
    throw new TypeError("observationId does not match canonical observation identity");
  }
  return {
    schema_version: SCHEMA_VERSION,
    observation_id: expectedId,
    execution_id: executionId,
    step,
    data,
    observed_at: observedAt,
  };
}

function createEvidence({ observation, sourceUri = null, retrievalMethod = null, evidenceId, parentEvidenceId = null }) {
  if (!observation || typeof observation !== "object") {
    throw new TypeError("observation must be an object");
  }
  assertNonEmptyString(observation.observation_id, "observation.observation_id");
  assertNonEmptyString(observation.execution_id, "observation.execution_id");
  assertNonEmptyString(observation.step, "observation.step");

  const artifactHash = sha256Canonical(observation.data);
  const identity = {
    execution_id: observation.execution_id,
    observation_id: observation.observation_id,
    artifact_hash: artifactHash,
  };
  const expectedId = "ev:" + sha256Canonical(identity);
  if (evidenceId !== undefined && evidenceId !== expectedId) {
    throw new TypeError("evidenceId does not match canonical evidence identity");
  }

  return {
    schema_version: SCHEMA_VERSION,
    evidence_id: expectedId,
    observation_id: observation.observation_id,
    execution_id: observation.execution_id,
    source_uri: sourceUri,
    retrieval_method: retrievalMethod,
    artifact_hash: "sha256:" + artifactHash,
    captured_at: observation.observed_at,
    parent_evidence_id: parentEvidenceId,
  };
}

function createVerification({ evidenceId, method, outcome, verifiedAt = new Date().toISOString(), verifier = "system", verificationId }) {
  assertNonEmptyString(evidenceId, "evidenceId");
  assertNonEmptyString(method, "method");
  if (!["pass", "fail", "inconclusive"].includes(outcome)) {
    throw new TypeError("outcome must be pass, fail, or inconclusive");
  }
  // Verification identity represents the verification assertion, not the wall-clock time.
  // Time remains recorded metadata, but repeating the same assertion is idempotent.
  const expectedId = "ver:" + sha256Canonical({ evidence_id: evidenceId, method, outcome, verifier });
  if (verificationId !== undefined && verificationId !== expectedId) {
    throw new TypeError("verificationId does not match canonical verification identity");
  }
  return {
    schema_version: SCHEMA_VERSION,
    verification_id: expectedId,
    evidence_id: evidenceId,
    method,
    outcome,
    verified_at: verifiedAt,
    verifier,
  };
}

function createProvenance({ evidenceId, sourceId, sourceUri = null, retrievedAt, adapterId, adapterVersion, codeRevision = null, environmentDigest = null, requestId = null, rawArtifactRef = null, transformId = null }) {
  assertNonEmptyString(evidenceId, "evidenceId");
  assertNonEmptyString(sourceId, "sourceId");
  assertNonEmptyString(adapterId, "adapterId");
  assertNonEmptyString(adapterVersion, "adapterVersion");
  assertNonEmptyString(retrievedAt, "retrievedAt");
  return {
    schema_version: SCHEMA_VERSION,
    evidence_id: evidenceId,
    source_id: sourceId,
    source_uri: sourceUri,
    retrieved_at: retrievedAt,
    adapter_id: adapterId,
    adapter_version: adapterVersion,
    code_revision: codeRevision,
    environment_digest: environmentDigest,
    request_id: requestId,
    raw_artifact_ref: rawArtifactRef,
    transform_id: transformId,
  };
}

function replayEvidenceIdentity({ executionId, step, data }) {
  const observation = createObservation({ executionId, step, data, observedAt: "1970-01-01T00:00:00.000Z" });
  return createEvidence({ observation }).evidence_id;
}

function getArtifactHash(evidence) {
  assertNonEmptyString(evidence.artifact_hash, "evidence.artifact_hash");
  return evidence.artifact_hash;
}

module.exports = {
  SCHEMA_VERSION,
  assertNonEmptyString,
  canonicalize,
  sha256Canonical,
  createExecution,
  createObservation,
  createEvidence,
  createVerification,
  createProvenance,
  getArtifactHash,
  replayEvidenceIdentity,
};
