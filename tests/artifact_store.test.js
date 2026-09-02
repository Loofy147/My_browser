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

test("raw artifact write rolls back with failed evidence transaction",()=>{
 const db=openEvidenceDB();
 const refInput=Buffer.from("rollback-me","utf8");
 assert.throws(()=>require("../src/evidence_store").persistRecord(db,{
   executionId:"exec-rollback",source:"fixture",adapter:"test",step:"row-1",
   data:{value:1},rawArtifact:refInput,rawMediaType:"text/plain",
   relations:[{evidenceId:"wrong-source",relation:"supersedes",relatedEvidenceId:"ev:missing"}]
 }));
 const {prepareRawArtifact}=require("../src/artifact_store");
 const ref=prepareRawArtifact(refInput).artifactRef;
 assert.equal(db.prepare("SELECT count(*) AS n FROM raw_artifacts WHERE artifact_ref = ?").get(ref).n,0);
 assert.equal(db.prepare("SELECT count(*) AS n FROM evidence WHERE execution_id = ?").get("exec-rollback").n,0);
 db.close();
});
