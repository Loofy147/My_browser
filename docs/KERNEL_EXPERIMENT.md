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

## Gate result

The cross-source kernel acceptance gate passed on GitHub Actions for Node 22.x and Node 24.x.

Observed CI evidence for commit `8b523854db0362d0372231cbf3537401c74b3ee8`:

- deterministic lockfile generation twice from the clean manifest;
- byte-identical generated lockfiles;
- successful `npm ci --ignore-scripts`;
- complete test suite: 19 passed, 0 failed;
- two consecutive `npm start` executions succeeded with matching canonical/dashboard counts;
- generated dashboard and SQLite database checks succeeded.

This closes the current gate for the tested scope. It does not establish source authenticity, production browser capability, customer demand, or a commercial wedge.

## Current hypothesis

Different external source adapters can share one strict lifecycle — acquisition, observation, evidence, verification, provenance, and history — without source-specific semantics leaking into the kernel.

The hypothesis survived the current acceptance gate for the tested scope. It remains falsifiable as additional source shapes and downstream use cases are introduced.

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

Canonical identity replay reconstructs the expected Evidence ID from `execution + step + normalized observation`. It validates the identity contract; it does **not** by itself prove that the raw source can be re-transformed. Raw-input transformation replay is the source-to-output reproducibility check.

## What this experiment does NOT prove

- It does not prove source authenticity.
- It does not provide cryptographic signatures or remote attestations.
- It does not implement a real PDF parser.
- It does not implement GitHub network transport.
- It does not provide a real browser runtime.
- It does not establish a generic evidence graph.
- It does not establish market demand, willingness to pay, or a defensible external product wedge.

## Reproducibility status

Installation and execution reproducibility are tracked separately.

- **Manifest-level clean-run reproducibility:** demonstrated in CI.
- **Execution reproducibility:** demonstrated for the declared transform replay contract.
- **Committed-lock reproducibility:** not claimed because `package-lock.json` is not committed.

CI therefore proves that a clean runner can resolve the manifest deterministically for the tested state and then perform `npm ci` against that generated lockfile. It does not prove committed-lock reproducibility.

## Next controlled experiment

Do not expand into a browser or generic scraping product.

The next experiment should introduce only a small number of additional source shapes and measure downstream value:

```text
Source
  -> Adapter
  -> Canonical Evidence
  -> Verification / Relations
  -> Research or Decision Workflow
  -> Measurable Outcome
```

Capability expansion must follow demonstrated downstream value. If additional source types require growing source-specific semantic exceptions, re-scope the kernel rather than accumulating exceptions.
