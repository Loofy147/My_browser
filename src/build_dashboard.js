const fs=require("node:fs"),path=require("node:path");
const {allRuns}=require("./db");
const {ensureEvidenceSchema}=require("./evidence_store");

function escapeHTML(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");}
function safeJSON(value){return JSON.stringify(value).replaceAll("<","\\u003c").replaceAll(">","\\u003e").replaceAll("&","\\u0026");}

function canonicalRuns(db){
  ensureEvidenceSchema(db);
  const rows=db.prepare(`SELECT e.evidence_id, e.execution_id, e.observation_id, e.source_uri,
    e.retrieval_method, e.artifact_hash, e.captured_at, o.step, o.data,
    v.outcome AS verification_outcome, v.method AS verification_method
    FROM evidence e
    JOIN observations o ON o.observation_id=e.observation_id
    LEFT JOIN verifications v ON v.evidence_id=e.evidence_id
    ORDER BY e.captured_at ASC, e.evidence_id ASC`).all();

  return rows.map(row=>({
    evidence_id:row.evidence_id,
    execution_id:row.execution_id,
    observation_id:row.observation_id,
    source_uri:row.source_uri,
    retrieval_method:row.retrieval_method,
    artifact_hash:row.artifact_hash,
    captured_at:row.captured_at,
    step:row.step,
    data:JSON.parse(row.data),
    verification_outcome:row.verification_outcome??"unverified",
    verification_method:row.verification_method??null,
  }));
}

function buildDashboard(db,outPath){
  const runs=canonicalRuns(db);
  const bySource=Object.create(null);
  for(const run of runs){const key=run.source_uri||"unknown";bySource[key]=(bySource[key]||0)+1;}

  const rowsHTML=runs.map(run=>[
    "<tr>",
    "<td>"+escapeHTML(run.evidence_id)+"</td>",
    "<td>"+escapeHTML(run.execution_id)+"</td>",
    "<td>"+escapeHTML(run.step)+"</td>",
    "<td>"+escapeHTML(run.verification_outcome)+"</td>",
    "<td>"+escapeHTML(run.artifact_hash)+"</td>",
    "<td>"+escapeHTML(run.captured_at)+"</td>",
    "</tr>"
  ].join("")).join("");

  const html=["<!DOCTYPE html>",'<html><head><meta charset="utf-8"><title>Evidence Dashboard</title>',
    "<style>body{font-family:system-ui,sans-serif;margin:2rem;color:#1a1a1a}table{border-collapse:collapse;width:100%;margin-top:1rem}th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:14px}th{background:#f4f4f4}</style>",
    "</head><body>","<h1>Evidence Dashboard</h1>",
    '<div id="summary">'+escapeHTML(runs.length+" evidence records | "+Object.keys(bySource).length+" sources")+"</div>",
    '<table id="evidence-table"><thead><tr><th>Evidence</th><th>Execution</th><th>Step</th><th>Verification</th><th>Artifact hash</th><th>Captured</th></tr></thead>',
    "<tbody>"+rowsHTML+"</tbody></table>",
    "<script>const EVIDENCE="+safeJSON(runs)+";const SOURCES="+safeJSON(bySource)+";</script>",
    "</body></html>"].join("\n");

  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,html,"utf8");
  return{rowCount:runs.length,outPath};
}

module.exports={buildDashboard,escapeHTML,canonicalRuns};