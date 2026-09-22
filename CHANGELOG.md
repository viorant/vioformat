# Changelog

All notable changes to the `.vio` artifact format. The format version (`vio: N`) is separate from the
specification revision; see [GOVERNANCE.md](GOVERNANCE.md#versioning).

## Revision 5 — 2026-09-22 · format version 1 · **VIO 1.0**

The specification is re-based onto the format as implemented and frozen. `.vio` 1.0 is locked; **no part of this
revision changes the format.** Every change is a correction to the document, the fixtures or the tooling.

### Why

Revisions 1–4 were written at a "target altitude" with an implemented-subset carve-out. The result disagreed with
the reference implementation in both directions: all four fixtures this repository called valid were rejected by
the reference parser, and all three bundles the reference implementation produces were rejected by this
repository's own linter — while both suites stayed green, because neither ever ran the other's inputs. Errata
`E-004`.

### Corrected

- `manifest.version` and `manifest.signer` are **optional**, not required (`E-006`). The reference producer emits
  neither.
- `manifest.requires[]` connector entries carry **`kind`** and **`tools`**, both required. Absent in revisions 1–4.
- `manifest.framework` is a **closed set of three** — `crewai`, `langchain`, `autogen`. Registry-reserved ids such
  as `claude-sdk` are rejected values; registration reserves a name only (`E-007`).
- Prompt `content` requires **both** `system` and `user`.
- §1.4 property 3 — *"The format grows without breaking older deployers"* — was **false and is removed** (`E-005`).
  Every object is closed, so an unknown key is rejected; additive change requires a new format version.
- Skill-tree digests apply **no Unicode normalization** (`E-008`). RFC 8785 governs and does not normalize.
- Conformance: **digest recomputation moves from Level 2 to Level 1.** With signing inactive, a reader that skips
  it provides no integrity at all.

### Added

- **§2.2 The digest subject**, in full — JCS, the body minus `id` and `type`, the per-type projection, and the
  absent-stays-absent rule. Previously rendered as "sha256 of the artifact's canonical content", which is not
  implementable. This is the load-bearing rule of 1.0.
- **§3 The update lifecycle** — what a redeploy replaces, what it preserves, and the ordering constraint: the
  existence check runs *before* the write, because a check performed after reports a preservation that did not
  happen.
- **§1.9 The agent**, normative — `model`, `prompts`, `skills` and `inputs` are all required.
- **§1.7** — `provider://` for hosted models, the scheme every real bundle uses and which no earlier revision
  defined.
- **§1.8** — the agent memory binding `{ read[], write[] }` with `write` holding at most one id, and the
  100,000-character body cap.
- **§7 Versioning and compatibility** — the three numbers, and the consequence of closed objects.
- A **quoting rule**: values whose YAML scalar resolution is ambiguous are always quoted. Revisions 1–4 used
  `algo_id: 0x02` and unquoted timestamps in their own examples, which resolve differently per parser and break
  the plain-YAML guarantee the same document makes.

### Tooling

- `schema/v1/vio.schema.json` is **generated** from the reference implementation, with a drift check.
- Fixtures are the bundles the reference implementation actually produces, digests intact; invalid cases are
  generated as single-violation mutations. The truncated `sha256:9f2a…` placeholders are gone.
- The linter validates structure against the generated schema, **verifies every digest**, and tests the
  plain-YAML guarantee by parsing under two YAML cores and comparing.

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
