# Governance

## Charter

The `.vio` artifact format exists so that an agent composed in one tool can be verified and deployed by another,
without either reinventing the format. Its scope is packaging: how prompts, skills, memory, models and agents are
bundled, digested and signed. It deliberately does not define cryptography (Sign), scheduling (deployers) or
framework semantics (adapters).

Four commitments hold across revisions:

1. **Readable without us.** The plain-YAML guarantee is not negotiable. A revision that requires format-specific
   tooling to parse is out of scope.
2. **Additive by default.** New fields default to the behaviour of bundles that omit them. The memory `layer` field —
   optional, defaulting to what existing bundles carried, outside the digest subject — is the template.
3. **Reserved, not ignored.** Unknown values in enumerated fields cause rejection, never a guess. Silent acceptance
   is how a deployer mis-deploys.
4. **The built subset is published.** The gap between the specification and its reference implementation is stated
   in the specification itself and kept current.

## Licensing commitments

These are commitments, not defaults:

1. **Permissive, permanently.** The specification stays CC-BY-4.0 and the tooling Apache-2.0. The project does not
   collect a CLA, so relicensing would require every contributor's permission — that is the point.
2. **Royalty-free patents for conforming implementations**, by the covenant in [PATENTS.md](PATENTS.md), reciprocal
   and binding on successors.
3. **Certification on evidence.** `VIO Conformant` is granted for passing the conformance suite, to anyone,
   including competitors of the reference implementer.
4. **Marks held separately.** Trademarks sit with Viorant Inc. so that a future donation of the specification and
   tooling to a foundation is a deliberate act rather than an accident of licensing.

## Editors

Vivien Roggero (CEO, Viorant) and Adi Vora (CTO, Viorant) author and maintain the specification.
Authorship per revision is tracked in [CONTRIBUTORS.md](CONTRIBUTORS.md).

## On the name

`.vio` takes its extension from Viorant, where the format originated. *Verifiable Intelligence Object* is a
descriptive expansion adopted afterwards, not the origin of the letters. The format is maintained independently of
any single implementation; the specification, the website and this repository are not hosted on a vendor domain.

## Change process

Load-bearing decisions are recorded as numbered **architecture decision records** in [`spec/adr/`](spec/adr/).
A change to the format follows the path an ADR takes: proposal with the problem stated and alternatives named,
review by the editors, acceptance with a date, and — where a decision supersedes an earlier one — an explicit note
on the superseded record. The specification text then changes in a numbered revision that cites the ADR.

Proposals that touch the reserved value sets, the digest subject of any artifact type, or the canonical form must
include a **compatibility statement**: what existing bundles do under the change, and whether producers or consumers
ship first.

## Versioning

| | |
|---|---|
| `vio: N` | The format version, an integer at the top of every bundle. Increments only when a reader built against the previous version could misread a bundle. Additive fields do not increment it. |
| Specification revision | The prose document carries a revision number and date. Revisions can add fields, tighten wording or record errata without changing `vio`. |
| `manifest.version` | The package's own semantic version, chosen by its author. Unrelated to the format version. |
