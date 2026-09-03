# Reproducibility Contract

This repository distinguishes three reproducibility claims:

1. **Manifest-level clean-run reproducibility** — a clean runner resolves the dependency set declared by `package.json`; the generated lockfile is byte-identical across two independent generations; `npm ci` then succeeds against that generated lockfile.
2. **Committed-lock reproducibility** — a clean checkout already contains `package-lock.json`, so `npm ci` requires no dependency-resolution step. This is **not currently claimed**.
3. **Execution reproducibility** — the same retained raw artifact and declared transform ID/version produce the same normalized artifact hash.

The current GitHub Actions gate demonstrated (1) and (3) for the tested repository state on Node 22.x and Node 24.x. It also exercised the end-to-end pipeline twice successfully.

The absence of a committed lockfile is a known scope choice, not an assertion of deterministic committed dependency state. A future release may promote committed-lock reproducibility only after a reviewed lockfile is generated from the canonical repository state and committed.
