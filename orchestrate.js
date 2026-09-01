const path=require("node:path");
const {loadFile,extractTable}=require("./src/dom_automation");
const {openEvidenceDB,persistRecord}=require("./src/evidence_store");
const {allRuns}=require("./src/db");
const {ingestMCPResult}=require("./src/mcp_ingest");
const {buildDashboard}=require("./src/build_dashboard");

const ROOT=__dirname;
const DB_PATH=path.join(ROOT,"data","toolkit.db");
const DASHBOARD_PATH=path.join(ROOT,"dashboard","index.html");

function main(){
  const db=openEvidenceDB(DB_PATH);
  try{
    const document=loadFile(path.join(ROOT,"fixtures","data_table.html"));
    const rows=extractTable(document,"#results");

    for(const row of rows){
      persistRecord(db,{
        executionId:"orchestrated-dom",
        source:"fixture:data_table",
        adapter:"dom",
        step:row.Name,
        data:row,
        sourceUri:"fixture://data_table.html",
        retrievalMethod:"table-extraction",
        verification:{
          verificationId:"ver:orchestrated-dom:"+row.Name,
          method:"independent-fixture-readback",
          outcome:"pass",
          verifier:"pipeline-test"
        }
      });
    }

    const mcpCount=ingestMCPResult(db,{
      runLabel:"orchestrated-run",
      source:"alphaXiv:discover_papers",
      filePath:path.join(ROOT,"fixtures","mcp_result_example.json"),
      executionId:"orchestrated-mcp"
    });

    const dashboard=buildDashboard(db,DASHBOARD_PATH);
    const canonicalEvidence=db.prepare("SELECT count(*) AS n FROM evidence").get().n;
    const summary={
      dom_rows_extracted:rows.length,
      mcp_records_ingested:mcpCount,
      canonical_evidence_records:canonicalEvidence,
      dashboard_rows:dashboard.rowCount,
      legacy_rows:allRuns(db).length,
      matches:dashboard.rowCount===canonicalEvidence && canonicalEvidence===rows.length+mcpCount
    };

    console.log(JSON.stringify(summary,null,2));
    if(!summary.matches)throw new Error("Canonical evidence/dashboard count mismatch");
    document.defaultView.close();
    return summary;
  }finally{db.close();}
}

if(require.main===module)main();
module.exports={main};