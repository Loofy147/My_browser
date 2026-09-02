const crypto = require("node:crypto");

function sha256Bytes(bytes) {
  return "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");
}

function assertRawArtifact(rawArtifact) {
  if (typeof rawArtifact === "string") return Buffer.from(rawArtifact, "utf8");
  if (Buffer.isBuffer(rawArtifact)) return rawArtifact;
  if (rawArtifact instanceof Uint8Array) return Buffer.from(rawArtifact);
  throw new TypeError("rawArtifact must be a string, Buffer, or Uint8Array");
}

function ensureArtifactSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS raw_artifacts (
      artifact_ref TEXT PRIMARY KEY,
      content BLOB NOT NULL,
      media_type TEXT,
      byte_length INTEGER NOT NULL,
      captured_at TEXT NOT NULL,
      UNIQUE(artifact_ref)
    );
  `);
}

function prepareRawArtifact(rawArtifact) {
  const bytes = assertRawArtifact(rawArtifact);
  return { bytes, artifactRef: sha256Bytes(bytes) };
}

function storeRawArtifact(db, { rawArtifact, mediaType = "application/octet-stream", capturedAt = new Date().toISOString() }) {
  ensureArtifactSchema(db);
  const { bytes, artifactRef } = prepareRawArtifact(rawArtifact);

  db.prepare(`
    INSERT OR IGNORE INTO raw_artifacts(artifact_ref,content,media_type,byte_length,captured_at)
    VALUES(?,?,?,?,?)
  `).run(artifactRef, bytes, mediaType, bytes.byteLength, capturedAt);

  return artifactRef;
}

function getRawArtifact(db, artifactRef) {
  const row = db.prepare(
    "SELECT artifact_ref, content, media_type, byte_length, captured_at FROM raw_artifacts WHERE artifact_ref = ?"
  ).get(artifactRef);
  return row ?? null;
}

module.exports = { sha256Bytes, prepareRawArtifact, ensureArtifactSchema, storeRawArtifact, getRawArtifact };
