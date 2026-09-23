# Changelog

All notable changes to the `.vio` artifact format. The format version (`vio: N`) is separate from the
specification revision; see [GOVERNANCE.md](GOVERNANCE.md#versioning).

## Revision 4 — 2026-09-04 · format version 1

### Added
- §1.8 — memory artifact bodies declare a `layer` of `seed` or `runtime`. Optional; omitted means `seed`.
- Materialization rules: `seed` → `{id}.memory.md` at the memory root, `runtime` → `.runtime/{id}.memory.md`.
- Redeploy preservation: an existing runtime object is checked for *before* writing and skipped.

### Notes
- `layer` is **not** part of the digest subject. A memory artifact digests `{ content }` only, so existing
  `manifest.artifacts[].digest` values stay valid and no re-export is forced.
- Rollout is **consumers-first**: a bundle carrying `layer` is rejected by a runtime built against a pre-`layer`
  schema, so producers must ship after consumers.

## Revisions 2–3 — 2026-06 → 2026-08 · format version 1

### Changed
- Specification text aligned with ADR-035: two-tier trust, two signing domains, templated artifacts
  (sections / variables / bindings / two-facet output), skills as file trees, the models rail and the connector
  rail, decode-parameter precedence (`run > agent > model-default`).

### Added
- The implemented-subset section, stating the line between the standard and what is built.

## ADR-035 — 2026-06-14

`.vio` is a signed YAML artifact bundle, deployed by Helix. Supersedes the format clause of ADR-010.

## Revision 1 — 2026-05-08 · format version 1

Specification created.

## ADR-010 — retired

`.vio` as an OCI image carrying an `org.viorant.manifest.v1` annotation. Retired by ADR-035; see
[`spec/v1/errata.md`](spec/v1/errata.md) entry `E-001`.
