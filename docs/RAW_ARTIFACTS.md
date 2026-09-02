# Raw Artifact Retention

Normalized evidence is not a substitute for the source artifact.

The kernel stores raw artifacts separately and references them by a SHA-256 content identifier:

```
raw bytes
  -> sha256:<digest>
  -> raw_artifacts
  -> evidence_provenance.raw_artifact_ref
```

The raw artifact and normalized observation have different identities.

This distinction preserves:

- byte-level replay inputs;
- extraction/debugging evidence;
- transformation lineage;
- source-format fidelity.

A raw-artifact hash proves the stored bytes have not changed. It does not prove source authenticity.
