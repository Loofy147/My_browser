const fs=require("node:fs");
const {ensureEvidenceSchema,persistRecord}=require("./evidence_store");

function ingestMCPResult(db,{runLabel,source,filePath,executionId=runLabel}){
  ensureEvidenceSchema(db);
  const records=JSON.parse(fs.readFileSync(filePath,"utf8"));
  if(!Array.isArray(records))throw new TypeError("Expected an array of results");

  for(const record of records){
    if(record==null||typeof record!=="object"||Array.isArray(record))throw new TypeError("Every MCP record must be a JSON object");
    const step=record.id||record.title;
    if(!step)throw new Error("Every MCP record needs an id or title");

    persistRecord(db,{
      executionId,
      source,
      adapter:"mcp-json",
      step,
      data:record,
      sourceUri:typeof record.url==="string"?record.url:null,
      retrievalMethod:"external-mcp-json"
    });
  }
  return records.length;
}

module.exports={ingestMCPResult};