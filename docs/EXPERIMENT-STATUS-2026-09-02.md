# My_browser Kernel Experiment Status — 2026-09-02

## Scope

This record captures the state after the cross-source evidence-kernel gate was hardened. The repository is being evaluated as a reusable internal capability candidate, not as a browser product or standalone SaaS.

## Confirmed repository properties

- Web DOM, PDF-text, and GitHub-API probes share a canonical observation shape while retaining source-specific provenance.
- Observation and Evidence identifiers are derived from canonical inputs and reject mismatched caller-supplied identifiers.
- Raw artifacts can be retained by byte-content SHA-256 reference.
- Raw artifacts, canonical Evidence, provenance, transform lineage, relations, and verification participate in explicit persistence semantics.
- Deterministic transform replay is defined from raw bytes plus transform ID/version.
- Identity replay is explicitly treated as a separate invariant from source-to-output transformation replay.
- Recent tests cover cross-adapter lifecycle behavior, raw artifact retention/rollback, transform lineage, and deterministic replay.

## Gate result

The GitHub Actions CI run `33679026934` for commit `8b523854db0362d0372231cbf3537401c74b3ee8` passed on both Node 22.x and Node 24.x.

For both matrix jobs, the following completed successfully:

- clean checkout;
- Node setup;
- deterministic lockfile generation twice from the clean manifest, with byte-identical results;
- `npm ci --ignore-scripts`;
- complete test suite: 19 passed, 0 failed;
- two consecutive `npm start` executions with matching canonical/dashboard counts;
- generated dashboard and SQLite database existence checks.

This closes the current cross-source kernel acceptance gate for the tested scope.

## Evidence boundary

The gate result proves the tested repository behavior on GitHub Actions for Node 22.x and Node 24.x. It does not create claims beyond the fixtures and invariants actually exercised.

The local execution environment still cannot resolve external GitHub/registry hosts, so local clean-install or CI reproduction is not asserted from the local environment.

## Decision

**Status: GATE PASSED / INTERNAL CAPABILITY CANDIDATE.**

The kernel abstraction survived the current acceptance gate without requiring source-specific semantic exceptions. Do not turn it into a browser product or generic scraping product on the basis of this result.

The next controlled experiment is limited to a small number of additional source shapes and, more importantly, measurement of whether canonical Evidence materially improves research, verification, or decision workflows. Additional implementation should be justified by observed downstream value, not by feature completeness.

## Non-claims

This status does not establish:

- source authenticity or non-repudiation,
- production-grade browser execution,
- generic evidence-graph superiority,
- external customer demand or willingness to pay,
- an independently defensible commercial wedge.
