# My_browser

A small, reproducible Node.js automation/data pipeline.

This is not a full browser and does not replace Playwright or Puppeteer.

## Components

- DOM automation with jsdom: execute page JavaScript, fill inputs, dispatch events, and extract tables/lists.
- SQLite persistence using Node's built-in `node:sqlite`.
- HTTP client with timeout and retry handling.
- JSON ingestion bridge for results produced by an external MCP/tool layer.
- Self-contained HTML dashboard generation.

## Requirements

- Node.js 22.13+.
- npm.

Node's `node:sqlite` was added in Node 22.5 and stopped requiring the experimental flag in Node 22.13. See https://nodejs.org/api/sqlite.html

## Run

```bash
npm install
npm test
npm start
npm start
```

The end-to-end run writes `data/toolkit.db` and `dashboard/index.html`. These generated artifacts are ignored by Git.

## Architecture

```
HTML / JSON / API source
          |
          v
 acquisition + DOM/API handling
          |
          v
     normalized record
          |
          +---- external MCP/tool result JSON
          |
          v
       SQLite store
          |
          v
       dashboard
```

The MCP bridge does not call MCP servers itself. An external tool layer produces JSON; this repository owns ingestion and persistence.

## Verification boundary

The tests verify the implemented execution paths and data integrity. jsdom is not a real rendering engine: this repository does not provide CSS layout, screenshots, or live-browser validation.

## Idempotency

Records have a stable `run_label + source + step` identity. Re-running the same pipeline updates the existing logical record instead of creating a duplicate.
