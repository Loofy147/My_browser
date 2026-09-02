# Raw Artifact Retention

Normalized evidence is not a substitute for the source artifact.

The kernel stores raw artifacts separately and references them by a SHA-256 content identifier:

```
raw bytes
  -> sha256:<digest>
  -> raw_artifacts
  -> evidence_provenance.raw_artifact_ref
```

The raw artifact and normalized observation have different identities. Raw persistence occurs in the same SQLite transaction as the canonical evidence bundle, so a failed evidence write does not intentionally leave a raw artifact behind.

This distinction preserves:

- byte-level replay inputs;
- extraction/debugging evidence;
- transformation lineage;
- source-format fidelity.

A raw-artifact hash proves the stored bytes have not changed. It does not prove source authenticity.


## Transformation lineage

When normalization or extraction declares a `transform_id`, the kernel records an `evidence_transforms` row linking the raw input artifact reference to the output evidence identity. This makes the transform boundary inspectable without making transformation metadata part of the content hash.