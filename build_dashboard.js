/**
 * build_dashboard.js — generates a single, self-contained HTML dashboard
 * from whatever is actually in the local database.
 *
 * Design choice, stated: data is embedded directly in the HTML (as a JS
 * object literal) rather than fetched async from a separate JSON file.
 * That means the output is a single file you can open directly in any
 * browser with zero server needed — and it's what let this be verified
 * with jsdom in this sandbox without needing file:// resource loading.
 *
 * VERIFIED: the generated HTML's structure and content (via jsdom) —
 * that the right number of rows render with the right values.
 * NOT VERIFIED: visual appearance/CSS layout — no real browser available
 * here to render and inspect that. Open the file for real to check that.
 */
const fs = require("fs");
const path = require("path");
const { openDB, allRuns } = require("./db");

function buildDashboard(db, outPath) {
  const runs = allRuns(db);

  const bySource = {};
  for (const r of runs) {
    bySource[r.source] = (bySource[r.source] || 0) + 1;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Automation Toolkit Dashboard</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #1a1a1a; }
  table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 14px; }
  th { background: #f4f4f4; }
  .status-success, .status-ingested { color: #1a7f37; }
  .status-error { color: #cf222e; }
  #summary { display: flex; gap: 2rem; margin-bottom: 1rem; }
  .stat { background: #f6f8fa; padding: 0.75rem 1.25rem; border-radius: 6px; }
  .stat .n { font-size: 1.5rem; font-weight: 600; }
</style>
</head>
<body>
  <h1>Automation Toolkit Dashboard</h1>
  <div id="summary"></div>
  <table id="runs-table">
    <thead><tr><th>ID</th><th>Run</th><th>Source</th><th>Step</th><th>Status</th><th>Created</th></tr></thead>
    <tbody id="runs-body"></tbody>
  </table>

  <script>
    const RUNS = ${JSON.stringify(runs)};
    const BY_SOURCE = ${JSON.stringify(bySource)};

    const summary = document.getElementById('summary');
    summary.innerHTML = \`
      <div class="stat"><div class="n">\${RUNS.length}</div><div>total records</div></div>
      <div class="stat"><div class="n">\${Object.keys(BY_SOURCE).length}</div><div>sources</div></div>
    \`;

    const body = document.getElementById('runs-body');
    body.innerHTML = RUNS.map(r => \`
      <tr>
        <td>\${r.id}</td>
        <td>\${r.run_label}</td>
        <td>\${r.source}</td>
        <td>\${r.step}</td>
        <td class="status-\${r.status}">\${r.status}</td>
        <td>\${r.created_at}</td>
      </tr>
    \`).join('');
  </script>
</body>
</html>`;

  fs.writeFileSync(outPath, html);
  return { rowCount: runs.length, outPath };
}

if (require.main === module) {
  const db = openDB(path.join(__dirname, "..", "data", "toolkit.db"));
  const result = buildDashboard(db, path.join(__dirname, "..", "dashboard", "index.html"));
  console.log(JSON.stringify(result, null, 2));
  db.close();
}

module.exports = { buildDashboard };
