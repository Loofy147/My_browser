# Reproducibility Contract

This repository distinguishes three installation claims:

1. **Manifest reproducibility** — a clean runner can resolve the exact dependency declared by `package.json` and then install from the generated lockfile with `npm ci`.
2. **Committed-lock reproducibility** — a clean checkout already contains `package-lock.json`, so `npm ci` requires no dependency resolution step.
3. **Execution reproducibility** — the same raw artifact and declared transform version produce the same normalized artifact hash.

The current repository satisfies the execution-replay contract through automated tests. It does **not** yet claim committed-lock reproducibility because `package-lock.json` is not committed.

CI therefore treats lockfile generation as an explicit preparatory step and immediately validates the generated lockfile with `npm ci`. This is a reproducible clean-run check, but it is not equivalent to committing a lockfile.

A future release may promote committed-lock reproducibility only after a lockfile generated from the canonical repository state is reviewed and committed.
