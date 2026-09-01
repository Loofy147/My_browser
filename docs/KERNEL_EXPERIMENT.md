# Kernel Experiment: Cross-Source Evidence Lifecycle

## Objective

Determine whether My_browser is a reusable acquisition/evidence primitive rather than only a useful automation toolkit.

The experiment deliberately limits the scope to three source shapes:

- Web DOM observation
- PDF text observation (the extraction layer is intentionally outside this kernel)
- GitHub API observation (the network transport is intentionally outside this kernel)

The question is whether all three can produce one stable lifecycle:

```text
Source
  -> Adapter
  -> Execution
  -> Observation
  -> Evidence
  -> Verification
  -> Provenance/History
```

## Current result

The repository now has an explicit adapter contract and three semantic adapter probes. They normalize a shared observation shape:

```text
subject_id
claim_type
value
```

The test suite verifies that the three adapters produce equivalent semantic payloads while retaining different source URIs and retrieval methods.

## Kernel invariants

### K1 — Canonical identity

Observation and evidence IDs are derived by the contract from canonical inputs. Callers cannot select an arbitrary ID without the contract rejecting it.

### K2 — Content change detection

The artifact hash is SHA-256 over canonical observation data. Reordering object keys does not change the hash; changing a value does.

### K3 — Execution context separation

Equal content obtained in different executions has equal artifact hashes but different evidence identities because execution context participates in evidence identity.

### K4 — Immutability by append-only identity

A changed observation produces a new observation/evidence identity rather than overwriting an existing artifact.

### K5 — Verification separation

Verification is a separate record referencing an existing evidence identity. Ingestion does not imply verification.

### K6 — Relationship integrity

SQLite foreign keys are enabled for the canonical tables. Orphan observations/evidence/verification records are rejected.

### K7 — Deterministic canonicalization

Unsupported values such as `undefined` and non-finite numbers are rejected instead of being silently normalized into ambiguous JSON.

### K8 — Cross-adapter semantic consistency

Web, PDF, and GitHub probes can represent the same logical observation with the same canonical data shape while retaining source-specific provenance fields.

## What this experiment does NOT prove

- It does not prove source authenticity.
- It does not provide cryptographic signatures or remote attestations.
- It does not implement a real PDF parser.
- It does not implement GitHub network transport.
- It does not provide a real browser runtime.
- It does not yet persist raw source artifacts independently of normalized observations.
- It does not establish a generic evidence graph.

Those are deliberately excluded so that the kernel hypothesis can be tested without hiding it behind feature volume.

## Acceptance gate for the next milestone

The hypothesis advances only when all of the following are demonstrated in automated tests and a clean repository run:

1. `npm ci` succeeds from a clean checkout.
2. The complete test suite passes on the supported Node versions.
3. Repeating the same acquisition is idempotent.
4. Mutating the source changes the artifact hash and evidence identity.
5. The same semantic payload across Web/PDF/GitHub has the same canonical artifact hash.
6. Different execution contexts retain distinct evidence identities.
7. A verification record can be added without mutating evidence.
8. Foreign-key violations fail closed.
9. A replay can reconstruct the canonical evidence identity from the recorded observation.
10. Provenance fields remain source-specific but contract-compatible.

If the kernel cannot satisfy this gate without adding large source-specific exceptions, the abstraction should be considered failed or re-scoped.
