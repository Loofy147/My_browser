# My_browser

A small, reproducible acquisition/evidence kernel experiment for Node.js.

This repository is **not** a full browser and is not intended to replace Playwright, Puppeteer, browserbase-style runtimes, or general scraping frameworks.

## Current thesis

The project tests a narrower architectural hypothesis:

> Different external source adapters can share one strict lifecycle — acquisition, observation, evidence, verification, provenance, and history — without source-specific semantics leaking into the kernel.

The cross-source kernel gate has now **passed for the tested scope**. The next question is whether the validated kernel creates measurable value in downstream research/decision systems.

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

The implemented contract provides canonical JSON normalization, SHA-256 artifact hashing, contract-derived observation/evidence identities, explicit verification records, raw-artifact retention, transformation lineage/replay, and SQLite persistence.

## Source probes

The repository currently includes three semantic adapter probes:

- Web DOM: extracts `subject_id`, `claim_type`, and value from a DOM node.
- PDF text: accepts already-extracted PDF text as the observation boundary; it does **not** implement PDF parsing.
- GitHub API: accepts an already-retrieved JSON response; network transport is intentionally outside the probe.

These probes are deliberately small. Their purpose is to test whether the kernel semantics remain stable across source types, not to build three full acquisition products.

## Gate result

GitHub Actions run `33679026934` passed on Node 22.x and 24.x. The run demonstrated deterministic lockfile generation from the manifest, successful `npm ci`, 19/19 tests passing, two successful end-to-end starts, matching canonical/dashboard counts, and generated artifact checks.

The gate validates the tested kernel scope. It does **not** prove source authenticity, production browser capability, generic evidence-graph superiority, customer demand, willingness to pay, or an external commercial moat.

## Current experiment

The next controlled experiment is recorded as GitHub Issue #2:

**Downstream decision-value validation with Algeria AI Product Fabric**

The comparison keeps downstream decision logic fixed and tests whether adding canonical acquisition/evidence semantics improves traceability, replayability, change detection, contradiction preservation, audit reconstruction, or other measurable outcomes.

No new adapters or product features should be added solely for this experiment.

## Existing capabilities

- DOM automation with jsdom.
- SQLite persistence using Node's built-in `node:sqlite`.
- HTTP client with timeout/retry handling.
- External MCP/tool-result JSON ingestion bridge.
- Canonical Execution → Observation → Evidence → Verification records.
- Content hashing and identity stability tests.
- Raw artifact retention and byte retrieval.
- Transformation lineage and deterministic raw-input replay.
- SQLite foreign-key enforcement for canonical tables.
- Self-contained audit dashboard.

## Run

```bash
npm install
npm test
npm start
```

The end-to-end run writes `data/toolkit.db` and `dashboard/index.html`. These generated artifacts are ignored by Git.

## Boundaries and non-claims

Hashing demonstrates content integrity/identity, not source authenticity. A JSON MCP result is not an MCP connection. jsdom is not a real browser runtime. The PDF and GitHub probes do not claim to implement their complete transport/parsing stacks.

The project is currently an **internal reusable capability candidate**, not a declared standalone product.

## Reproducibility status

Manifest-level clean-run reproducibility is demonstrated in CI by generating a lockfile twice and requiring byte-identical results before `npm ci`. Execution reproducibility is demonstrated for declared raw-byte transforms.

A reviewed committed `package-lock.json` is still not present, so committed-lock reproducibility is not claimed.

## Evidence retention

Raw source bytes are retained by SHA-256 reference, and declared normalization transforms are recorded as lineage from raw artifact to normalized Evidence outputs. This does not prove source authenticity.
