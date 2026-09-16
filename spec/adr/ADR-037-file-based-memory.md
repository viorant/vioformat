# ADR-037 — File-based memory model

**Status:** Accepted · **Author:** Adi Vora

## Context

Memory needed a representation that a deployer could materialize and a runtime could read and write, without a
database dependency and without making memory a signed asset it cannot be.

## Decision

Memory is `.md` files with frontmatter, per-agent read and write sets, lowered framework-neutrally. A memory
artifact ships its text inline as a body and declares a `layer` of `seed` or `runtime` (specification §1.8).
Memory stays in the integrity-only trust tier: digest, no signature.

## Consequences

- `layer` is optional and omitted means `seed`, so pre-`layer` bundles parse unchanged.
- `layer` is outside the digest subject — a memory artifact digests `{ content }` only — so adding it invalidates no
  existing digest.
- Rollout is consumers-first: a bundle carrying `layer` is rejected by a runtime built against the earlier schema.

## Alternatives considered

- **Derive the layer from the agent's read/write binding.** Rejected: layer is a property of the asset, binding is a
  property of the reference. Deriving would blank a curated memory the moment an agent wrote to it. Recorded as
  erratum `E-003`.
- **Omit runtime-layer artifacts entirely.** Rejected: the runtime has no create-on-demand path, so an absent write
  target fails the first run with a dangling reference.
