const path=require("node:path");
const {loadFile,extractTable}=require("./src/dom_automation");
const {openDB,recordStep,allRuns}=require("./src/db");
const {ingestMCPResult}=require("./src/mcp_ingest");
const {buildDashboard}=require("./src/build_dashboard");

const ROOT=__dirname;
const DB_PATH=path.join(ROOT,"data","toolkit.db");
const DASHBOARD_PATH=path.join(ROOT,"dashboard","index.html");

function main(){
  const db=openDB(DB_PATH);
  try{
    const document=loadFile(path.join(ROOT,"fixtures","data_table.html"));
    const rows=extractTable(document,"#results");
    for(const row of rows)recordStep(db,{runLabel:"orchestrated-run",source:"dom_automation:extractTable",step:row.Name,result:row,status:"extracted"});

    const mcpCount=ingestMCPResult(db,{runLabel:"orchestrated-run",source:"alphaXiv:discover_papers",filePath:path.join(ROOT,"fixtures","mcp_result_example.json")});
    const dashboard=buildDashboard(db,DASHBOARD_PATH);
    const runRows=allRuns(db).filter(r=>r.run_label==="orchestrated-run");
    const expected=rows.length+mcpCount;
    const summary={dom_rows_extracted:rows.length,mcp_records_ingested:mcpCount,logical_records:runRows.length,expected_logical_records:expected,dashboard_rows:dashboard.rowCount,total_rows_in_db:allRuns(db).length,matches:runRows.length===expected};

    console.log(JSON.stringify(summary,null,2));
    if(!summary.matches)throw new Error("Logical pipeline row-count mismatch");
    document.defaultView.close();
    return summary;
  }finally{db.close();}
}
if(require.main===module)main();
module.exports={main};