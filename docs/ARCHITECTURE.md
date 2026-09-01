# My_browser — Canonical Architecture

## Model

```
Execution
  |
  +--> Observation
          |
          +--> Evidence
                  |
                  +--> Verification
```

**Execution** describes an acquisition attempt: source, adapter, and time.

**Observation** describes what was obtained at a specific step.

**Evidence** is an immutable, content-addressed artifact derived from the observation. Its SHA-256 hash participates in its identity.

**Verification** records an explicit check. Ingestion never implies verification.

## Adapter boundary

Adapters produce observations. Downstream code must not infer the acquisition mechanism.

- `dom`: trusted HTML/DOM execution through jsdom.
- `mcp-json`: JSON exported by an external MCP/tool layer.
- future `browser`: real browser worker such as Playwright.
- future `http`: direct HTTP acquisition.

## Invariants

1. Evidence is immutable.
2. Identical content is idempotent.
3. Changed content creates a different evidence identity.
4. Verification is explicit.
5. Source/provenance metadata is separate from payload data.
6. jsdom is not treated as a real browser.
7. MCP JSON ingestion is not treated as direct MCP connectivity.
8. A content hash proves content identity/integrity, not source authenticity.

## Current boundaries

Still open: signed provenance, real-browser validation, distributed concurrency policy, richer schema/migrations, and production-grade HTTP retry/rate-limit policy.
