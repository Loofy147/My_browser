# Kernel Experiment: Cross-Source Evidence Lifecycle

## Objective

Determine whether `My_browser` is a reusable acquisition/evidence primitive rather than only a useful automation toolkit.

The experiment deliberately limits scope to three source shapes:

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
  -> Provenance / History
```

## Current result

The repository has an explicit adapter contract and three semantic adapter probes. They normalize a shared observation shape:

```text
subject_id
claim_type
value
```

The tests verify equivalent semantic payloads across the three probes while retaining source-specific provenance. Raw source bytes can also be retained by content hash and linked to normalized Evidence through provenance and transformation lineage.

This is evidence for an architectural hypothesis, not a product claim.

## Kernel invariants

### K1 — Canonical identity

Observation and Evidence IDs are derived by the contract from canonical inputs. Caller-supplied IDs are accepted only when they equal the canonical derivation.

### K2 — Content change detection

The normalized artifact hash is SHA-256 over canonical observation data. Reordering object keys does not change the hash; changing a value does.

### K3 — Execution context separation

Equal normalized content obtained in different executions has equal artifact hashes but different Evidence identities because execution context participates in Evidence identity.

### K4 — Immutability by identity

A changed observation produces a new Observation/Evidence identity rather than overwriting an existing artifact.

### K5 — Verification separation

Verification is a separate record referencing an existing Evidence identity. Ingestion does not imply verification.

### K6 — Relationship integrity

SQLite foreign keys are enabled for the canonical tables. Orphan Observation/Evidence/Verification references are rejected.

### K7 — Deterministic canonicalization

Unsupported values such as `undefined` and non-finite numbers are rejected instead of being silently normalized into ambiguous JSON.

### K8 — Cross-adapter semantic consistency

Web, PDF, and GitHub probes can represent the same logical observation with the same canonical data shape while retaining source-specific provenance fields.

### K9 — Raw artifact retention

When raw bytes are supplied, they are stored under a byte-content SHA-256 reference and linked to provenance. Raw persistence participates in the same transaction as the canonical Evidence bundle.

### K10 — Transformation lineage

A declared transform records its input raw artifact reference, transform identifier/version, and output Evidence identity.

### K11 — Transformation replay

A deterministic transform replay starts from retained raw bytes:

```text
raw artifact R + Transform T@v
  -> normalized observation O
  -> artifact hash H(O)
```

A valid replay reproduces the same normalized artifact hash for the same raw bytes and transform version. Changing the transform version may produce a different normalized artifact; the original Evidence remains immutable and a new Evidence/lineage record is required.

### K12 — Identity replay is distinct

Canonical identity replay reconstructs the expected Evidence ID from `execution + step + normalized observation`. It validates the identity contract; it does **not** by itself prove that the raw source can be re-transformed. Raw-input transformation replay is the stronger source-to-output reproducibility check.

## What this experiment does NOT prove

- It does not prove source authenticity.
- It does not provide cryptographic signatures or remote attestations.
- It does not implement a real PDF parser.
- It does not implement GitHub network transport.
- It does not provide a real browser runtime.
- It does not establish a generic evidence graph.
- It does not establish market demand, willingness to pay, or a defensible external product wedge.

## Reproducibility status

Installation and execution reproducibility are tracked separately. The repository does not yet contain a committed `package-lock.json`; therefore **committed-lock reproducibility is OPEN**.

CI currently performs a clean lock generation followed by `npm ci`, then runs the tests and explicit repeated-start idempotency check. This validates clean-run dependency resolution plus the ability to consume the resolved lock, but it must not be described as committed-lock reproducibility.

For the execution layer, automated tests cover raw-byte transform replay, normalized artifact determinism, lineage, and canonical Evidence identity reconstruction.

## Acceptance gate for the next milestone

The kernel hypothesis advances only when all of the following are demonstrated by automated tests and a successful clean CI run:

1. Clean installation is deterministic at the manifest level, and `npm ci` succeeds from the generated lockfile.
2. The complete test suite passes on supported Node versions.
3. Repeating the same acquisition is idempotent.
4. Mutating source bytes changes the raw artifact reference and, when normalization changes, the normalized artifact/Evidence identity.
5. The same semantic payload across Web/PDF/GitHub has the same canonical artifact hash.
6. Different execution contexts retain distinct Evidence identities for equal normalized content.
7. A verification record can be added without mutating Evidence.
8. Foreign-key violations fail closed.
9. Raw bytes are retained and byte-retrievable by their content hash.
10. Transformation lineage links raw inputs to normalized Evidence outputs.
11. Replay from raw bytes plus a declared transform version reproduces the normalized artifact hash.
12. Changing transform version is represented as a distinct transformation lineage and, when output changes, a distinct normalized artifact/Evidence identity.
13. Identity replay and transformation replay remain explicitly distinct.
14. Provenance fields remain source-specific but contract-compatible.

The hypothesis remains **OPEN** unless this gate is satisfied without source-specific semantic exceptions. If satisfying the gate requires increasing source-specific exceptions, the kernel abstraction should be re-scoped or killed rather than expanded into a feature-heavy browser product.
