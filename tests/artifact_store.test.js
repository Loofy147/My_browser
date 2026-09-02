const test=require("node:test"),assert=require("node:assert/strict");
const {openEvidenceDB}=require("../src/evidence_store");
const {storeRawArtifact,getRawArtifact,sha256Bytes}=require("../src/artifact_store");

test("raw artifact retention is content-addressed and byte-preserving",()=>{
 const db=openEvidenceDB();
 const raw=Buffer.from("source payload\nbytes", "utf8");
 const ref1=storeRawArtifact(db,{rawArtifact:raw,mediaType:"text/plain",capturedAt:"2026-09-01T00:00:00.000Z"});
 const ref2=storeRawArtifact(db,{rawArtifact:Buffer.from(raw),mediaType:"text/plain",capturedAt:"2026-09-01T00:01:00.000Z"});
 assert.equal(ref1,ref2);
 const row=getRawArtifact(db,ref1);
 assert.equal(row.artifact_ref,sha256Bytes(raw));
 assert.equal(Buffer.compare(row.content,raw),0);
 assert.equal(row.byte_length,raw.byteLength);
 assert.equal(db.prepare("SELECT count(*) AS n FROM raw_artifacts").get().n,1);
 db.close();
});