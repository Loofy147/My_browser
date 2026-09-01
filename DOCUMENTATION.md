# My_browser — Verification and Scope

## Reproducible local contract

`npm install`, `npm test`, `npm start`, then `npm start` again.

The second run must keep the same logical record count because ingestion is idempotent.

## Scope

The DOM layer executes trusted HTML JavaScript with jsdom. It is not a real browser renderer and does not provide screenshots or live-browser control.

The MCP bridge ingests JSON exported by an external tool/MCP layer. It is deliberately not an MCP client.

## Hardening

- Repository paths now match the orchestrator.
- Runtime dependency is declared.
- Tests use Node's built-in test runner.
- Records have a unique identity: `run_label + source + step`.
- Dashboard values are HTML-escaped and embedded JSON protects the script boundary.
- Generated DB/dashboard artifacts are ignored by Git.

## Remaining work

- Add cryptographic provenance for ingested evidence.
- Add rate limiting/backoff and status-aware retry policy.
- Add an optional Playwright adapter as a separate real-browser layer.
- Add CI and a clean-clone release gate.
