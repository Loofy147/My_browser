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

## Corrections made in this stage

1. `docs/KERNEL_EXPERIMENT.md` was reconciled with the implemented raw-artifact and replay model.
2. The experiment now states explicitly that source authenticity is not proved by content hashing.
3. The experiment now distinguishes committed-lock reproducibility, manifest-level clean-run reproducibility, and execution reproducibility.
4. CI was changed to generate a lockfile twice from the clean manifest, require byte-identical lockfiles, then run `npm ci` against that generated lockfile.
5. The double `npm start` execution is documented as an explicit idempotency exercise rather than an unexplained duplicate step.
6. `docs/REPRODUCIBILITY.md` records the remaining distinction: no committed `package-lock.json` means committed-lock reproducibility remains OPEN.

## Evidence boundary

The current integration surface did not expose a workflow run for the latest commit after the CI change. Therefore CI success is not yet asserted here.

The local execution environment also cannot resolve external GitHub/registry hosts, so local clean-install or full CI reproduction cannot be truthfully reported from this environment.

## Decision

**Status: OPEN / EXPERIMENTAL.**

Do not add new adapters or product features until the CI gate is externally observed passing on Node 22 and Node 24.

After a successful CI run, evaluate whether the kernel invariants hold without source-specific semantic exceptions. If they do, the next experiment should be a small number of additional source shapes and a measurement of decision/research value. If they do not, re-scope the abstraction before expanding it.

## Non-claims

This status does not establish:

- source authenticity or non-repudiation,
- production-grade browser execution,
- generic evidence-graph superiority,
- external customer demand or willingness to pay,
- an independently defensible commercial wedge.
