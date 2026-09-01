const { DatabaseSync } = require("node:sqlite");
function openDB(filePath=":memory:"){const db=new DatabaseSync(filePath);db.exec(`CREATE TABLE IF NOT EXISTS automation_runs(id INTEGER PRIMARY KEY AUTOINCREMENT,run_label TEXT NOT NULL,source TEXT NOT NULL,step TEXT NOT NULL,result TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now')),UNIQUE(run_label,source,step))`);return db;}
function recordStep(db,{runLabel,source,step,result,status}){if(!runLabel||!source||!step)throw new TypeError("runLabel, source, and step are required");return db.prepare(`INSERT INTO automation_runs(run_label,source,step,result,status)VALUES(?,?,?,?,?) ON CONFLICT(run_label,source,step) DO UPDATE SET result=excluded.result,status=excluded.status`).run(runLabel,source,step,JSON.stringify(result),status);}
function parseRow(row){return {...row,result:JSON.parse(row.result)};}
function getRun(db,runLabel){return db.prepare("SELECT * FROM automation_runs WHERE run_label=? ORDER BY id ASC").all(runLabel).map(parseRow);}
function allRuns(db){return db.prepare("SELECT * FROM automation_runs ORDER BY id ASC").all().map(parseRow);}
module.exports={openDB,recordStep,getRun,allRuns};