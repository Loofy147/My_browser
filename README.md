# My_browser

A small, reproducible acquisition/evidence kernel experiment for Node.js.

This repository is **not** a full browser and is not intended to replace Playwright, Puppeteer, browserbase-style runtimes, or general scraping frameworks.

## Current thesis

The project is testing a narrower architectural hypothesis:

> Different external source adapters can share one strict lifecycle — acquisition, observation, evidence, verification, provenance, and history — without source-specific semantics leaking into the kernel.

The hypothesis is still **open**, not a product claim.

## Kernel

```text
Source
  |
  v
Adapter
  |
  v
Execution
  |
  v
Observation
  |
  v
Evidence
  |
  v
Verification
  |
  v
Provenance / History
```

The implemented contract currently provides canonical JSON normalization, SHA-256 artifact hashing, contract-derived observation/evidence identities, explicit verification records, and SQLite persistence.

## Source probes

The repository currently includes three semantic adapter probes:

- Web DOM: extracts `subject_id`, `claim_type`, and value from a DOM node.
- PDF text: accepts already-extracted PDF text as the observation boundary; it does **not** implement PDF parsing.
- GitHub API: accepts an already-retrieved JSON response; network transport is intentionally outside the probe.

These probes are deliberately small. Their purpose is to test whether the kernel semantics remain stable across source types, not to build three full acquisition products.

## Existing capabilities

- DOM automation with jsdom.
- SQLite persistence using Node's built-in `node:sqlite`.
- HTTP client with timeout/retry handling.
- External MCP/tool-result JSON ingestion bridge.
- Canonical Execution → Observation → Evidence → Verification records.
- Content hashing and identity stability tests.
- SQLite foreign-key enforcement for canonical tables.
- Self-contained audit dashboard.

## Run

```bash
npm install
npm test
npm start
```

The end-to-end run writes `data/toolkit.db` and `dashboard/index.html`. These generated artifacts are ignored by Git.

## Experiment

See [`docs/KERNEL_EXPERIMENT.md`](docs/KERNEL_EXPERIMENT.md) for the falsifiable acceptance gate and the invariants being tested.

The most important current tests cover:

```text
identity stability
content-change detection
cross-adapter semantic equivalence
verification separation
foreign-key integrity
canonicalization failure modes
```

## Boundaries and non-claims

Hashing demonstrates content integrity/identity, not source authenticity. A JSON MCP result is not an MCP connection. jsdom is not a real browser runtime. The PDF and GitHub probes do not claim to implement their complete transport/parsing stacks.

## Reproducibility status

The repository does not yet contain a committed `package-lock.json`, so a fully clean `npm ci` reproduction gate remains open. CI is expected to be the final arbiter for the current branch; failures are not treated as successes merely because the local design is plausible.
