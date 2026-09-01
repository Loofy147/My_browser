/**
 * mcp_ingest.js — the real pattern for getting MCP tool output into this
 * pipeline. Read this file's comment before the code; the architecture
 * point matters more than the 15 lines of logic.
 *
 * THE ARCHITECTURAL FACT THIS CODE HAS TO RESPECT:
 * Code running in this sandbox (or in any Node/Python process this toolkit
 * would run in) has NO access to Claude's MCP tool-calling layer. It cannot
 * call alphaXiv, Scholar Gateway, Apollo, or any other MCP server directly
 * — not because of the network allowlist, but because that layer doesn't
 * exist inside a plain script. MCP tools are called by Claude, in
 * conversation, using credentials and a protocol this script has no access
 * to.
 *
 * So "MCP tool automation" cannot mean "this script autonomously calls MCP
 * servers." The real, working pattern — the one actually used earlier in
 * this session — is three separate steps:
 *   1. Claude calls a real MCP tool in conversation (e.g. alphaXiv
 *      discover_papers) and gets a real result.
 *   2. That result gets serialized to a JSON file.
 *   3. This script (or one like it) ingests that file into the local
 *      pipeline — same as it would ingest any other JSON.
 *
 * This file tests step 3 only, using fixtures/mcp_result_example.json,
 * which is the REAL, already-captured output of an alphaXiv discover_papers
 * call from earlier in this conversation — not fabricated for this test.
 */
const fs = require("fs");
const path = require("path");
const { openDB, recordStep } = require("./db");

function ingestMCPResult(db, { runLabel, source, filePath }) {
  const raw = fs.readFileSync(filePath, "utf8");
  const papers = JSON.parse(raw);
  if (!Array.isArray(papers)) {
    throw new Error("Expected an array of results — got: " + typeof papers);
  }
  for (const paper of papers) {
    recordStep(db, {
      runLabel,
      source,
      step: paper.id || paper.title || "unknown",
      result: paper,
      status: "ingested",
    });
  }
  return papers.length;
}

if (require.main === module) {
  const db = openDB(path.join(__dirname, "..", "data", "toolkit.db"));
  const count = ingestMCPResult(db, {
    runLabel: "mcp-ingest-test",
    source: "alphaXiv:discover_papers",
    filePath: path.join(__dirname, "..", "fixtures", "mcp_result_example.json"),
  });
  console.log(`Ingested ${count} real records from a real prior MCP tool call.`);
  db.close();
}

module.exports = { ingestMCPResult };
