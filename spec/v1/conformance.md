# Conformance

Three levels, cumulative. Each is defined by what an implementation must accept, what it must reject, and what it
must never do. Cases are in [`conformance/v1/cases.yaml`](../../conformance/v1/cases.yaml).

## Level 1 — Reader

- Parses any bundle that meets the plain-YAML guarantee with a stock YAML 1.2 parser.
- Requires `vio` to be an integer and rejects a version it does not implement.
- Treats every value outside the reserved sets for `composition`, `type`, `kind`, `runtime`, `deploy`, `source`,
  `tools[].kind`, `mode` and `layer` as reserved, and rejects cleanly.
- Reads a memory body with no `layer` as `seed`.
- Never interprets a `sig` or `digest` as verified.

## Level 2 — Verifier

Everything in Level 1, plus:

- Recomputes each artifact's `digest` over its canonical form: RFC 8785 for structured content; sorted-path,
  per-file NFC map for skill trees; `{ content }` only for memory.
- Verifies per-artifact `sig` against the signer's registered key for the declared `algo_id`.
- Verifies the `vio_bundle` signature over the canonical manifest, and therefore every listed digest.
- Reports a digest mismatch on a digest-only artifact as a bundle verification failure, not a warning.
- Never verifies over on-disk bytes; never accepts a signature computed over a rendered (interpolated) template.

## Level 3 — Deployer

Everything in Level 2, and verification precedes every other step, plus:

- Routes each artifact by its declared `deploy` value; never infers a destination.
- Resolves `ref`s on the target and checks the resolved bytes against the manifest digest before use.
- Gates on `manifest.requires[]` connector dependencies: a required connection absent from the control plane blocks
  the deploy.
- Binds `input`, `secret`, `connector`, `env` and `task` values after verification, never before; fails a run that
  omits a required `input`.
- Materializes memory by `layer` and never overwrites an existing runtime object on redeploy.

## Invariants every level shares

| Invariant | Statement |
|---|---|
| Secrets never enter the file | A bundle containing a literal credential where a `secret://` or `connection://` handle belongs is non-conforming, whatever its signatures say. |
| Capability is not widened silently | No implementation may grant a tool, connector or scope that is not declared in a signed skill and surfaced in `manifest.requires[]`. |
| Weights are never embedded | A `type: model` artifact with a body is non-conforming. |
| Producers ship after consumers | A producer must not emit a field that the deployed consumer population rejects. The memory `layer` rollout is the reference case. |
