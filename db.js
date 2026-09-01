/**
 * db.js — local results store for automation runs.
 *
 * Uses node:sqlite (Node's built-in module, marked experimental as of
 * Node 22.x — confirmed working here on v22.22.2, but the API may change
 * on a different Node version; pin your Node version if this matters).
 *
 * This is a real, file-backed database. No network involved, so nothing
 * about this sandbox's egress restrictions applies to it — it will work
 * identically wherever Node runs.
 */
const { DatabaseSync } = require("node:sqlite");
const path = require("path");

function openDB(filePath) {
  const db = new DatabaseSync(filePath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS automation_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_label TEXT NOT NULL,
      source TEXT NOT NULL,
      step TEXT NOT NULL,
      result TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return db;
}

function recordStep(db, { runLabel, source, step, result, status }) {
  const stmt = db.prepare(
    `INSERT INTO automation_runs (run_label, source, step, result, status) VALUES (?, ?, ?, ?, ?)`
  );
  return stmt.run(runLabel, source, step, JSON.stringify(result), status);
}

function getRun(db, runLabel) {
  const stmt = db.prepare(`SELECT * FROM automation_runs WHERE run_label = ? ORDER BY id ASC`);
  return stmt.all(runLabel).map((row) => ({ ...row, result: JSON.parse(row.result) }));
}

function allRuns(db) {
  const stmt = db.prepare(`SELECT * FROM automation_runs ORDER BY id ASC`);
  return stmt.all().map((row) => ({ ...row, result: JSON.parse(row.result) }));
}

module.exports = { openDB, recordStep, getRun, allRuns };
