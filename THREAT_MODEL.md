# My_browser — Threat Model

## Trust boundaries

### Untrusted HTML -> jsdom

The DOM layer uses `runScripts: "dangerously"`. Only trusted or isolated HTML may cross this boundary.

### External tool/API data -> ingestion

Successful parsing or insertion is not verification. External records remain untrusted observations until an explicit verification step is recorded.

### Data -> dashboard HTML

The dashboard performs output encoding and protects embedded JSON from script termination. This reduces injection risk but is not a general browser security boundary.

## Required future isolation

A real-browser adapter should run in an isolated worker/process/container with explicit network, filesystem, credential, CPU, memory, and timeout policies.

## Evidence authenticity

SHA-256 detects content changes and gives deterministic identity. It does not prove who supplied the artifact or that a source actually returned it. That requires provenance and, where necessary, signatures/attestations.
