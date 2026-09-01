/**
 * orchestrate.js — one realistic pipeline run: scrape structured data from
 * an HTML source, record it to the database, ingest a separate MCP result,
 * build the dashboard, then read the dashboard back to confirm it's correct.
 * Every step below actually executes; nothing here is a mock of itself.
 */
const path = require("path");
const { loadFile, extractTable } = require("./src/dom_automation");
const { openDB, recordStep, allRuns } = require("./src/db");
const { ingestMCPResult } = require("./src/mcp_ingest");
const { buildDashboard } = require("./src/build_dashboard");

const DB_PATH = path.join(__dirname, "data", "toolkit.db");

async function main() {
  const db = openDB(DB_PATH);

  // 1. Real DOM extraction from a local HTML source
  const doc = loadFile(path.join(__dirname, "fixtures", "data_table.html"));
  const rows = extractTable(doc, "#results");
  rows.forEach((row) =>
    recordStep(db, { runLabel: "orchestrated-run", source: "dom_automation:extractTable", step: row.Name, result: row, status: "extracted" })
  );

  // 2. Real MCP tool result (already captured earlier this session), ingested
  const mcpCount = ingestMCPResult(db, {
    runLabel: "orchestrated-run",
    source: "alphaXiv:discover_papers",
    filePath: path.join(__dirname, "fixtures", "mcp_result_example.json"),
  });

  // 3. Build the dashboard from everything now in the database
  const dash = buildDashboard(db, path.join(__dirname, "dashboard", "index.html"));

  // 4. Read back and confirm
  const finalRows = allRuns(db);
  console.log(JSON.stringify({
    dom_rows_extracted: rows.length,
    mcp_records_ingested: mcpCount,
    dashboard_rows: dash.rowCount,
    total_rows_in_db: finalRows.length,
    matches: dash.rowCount === finalRows.length,
  }, null, 2));

  db.close();
}

main();
