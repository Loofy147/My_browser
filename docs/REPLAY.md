# Replay Contract

Replay starts from the retained raw artifact, not from a normalized database row.

For a deterministic transform T:

raw artifact R + T@v
  -> normalized observation O
  -> artifact hash H(O)

A valid replay reproduces the same normalized artifact hash for the same raw bytes and transform version.

Changing the transform version may produce a different normalized artifact. The original Evidence remains immutable; a new Evidence record and lineage are required for the new output.

Replay proves deterministic re-execution for the declared transform. It does not prove source authenticity.
