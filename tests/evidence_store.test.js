const test=require("node:test"),assert=require("node:assert/strict");
const {openEvidenceDB,persistRecord}=require("../src/evidence_store");

test("evidence is content-addressed, immutable and idempotent",()=>{
 const db=openEvidenceDB();
 const base={executionId:"exec-1",source:"fixture",adapter:"dom",step:"row-1",sourceUri:"fixture://data_table",retrievalMethod:"table-extraction",verification:{verificationId:"ver-1",method:"independent-readback",outcome:"pass",verifier:"test"}};

 const first=persistRecord(db,{...base,data:{Name:"Item A",Score:"91"}});
 const second=persistRecord(db,{...base,data:{Name:"Item A",Score:"91"}});
 const changed=persistRecord(db,{...base,data:{Name:"Item A",Score:"92"},verification:null});

 assert.equal(first.evidence.evidence_id,second.evidence.evidence_id);
 assert.notEqual(first.evidence.evidence_id,changed.evidence.evidence_id);
 assert.equal(db.prepare("SELECT count(*) AS n FROM executions").get().n,1);
 assert.equal(db.prepare("SELECT count(*) AS n FROM evidence").get().n,2);
 assert.equal(db.prepare("SELECT count(*) AS n FROM verifications").get().n,1);
 db.close();
});