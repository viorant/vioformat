# Contributors

Authorship is recorded per revision so that credit tracks the text, not the masthead.

## Editors

| | |
|---|---|
| **Vivien Roggero** | CEO and co-founder, Viorant. Format direction, positioning of the standard, governance and the website. Author on every published revision. |
| **Adi Vora** | CTO and co-founder, Viorant. Specification owner. Wrote the engineering text of revisions 1–4, ADR-035 and ADR-037, and the reference implementation in Hub and Helix. |

## Authorship by revision

| Revision | Date | Change | Author | Co-author / review |
|---|---|---|---|---|
| Revision 4 | 2026-09-04 | §1.8 — memory bodies declare a `layer` (seed \| runtime), optional, default seed, outside the digest subject. Materialization, redeploy preservation, consumers-first rollout. | Adi Vora | Vivien Roggero (review) |
| ADR-037 | 2026 | File-based memory model — `.md` files, per-agent read and write sets, framework-neutral lowering. | Adi Vora | — |
| Revisions 2–3 | 2026-06 → 2026-08 | Alignment with ADR-035: two-tier trust, two signing domains, templated artifacts, skills as file trees, models and connector rails, decode-parameter precedence, implemented-subset section. | Adi Vora | Vivien Roggero (co-author) |
| ADR-035 | 2026-06-14 | `.vio` is a signed YAML artifact bundle deployed by Helix. Supersedes the format clause of ADR-010. | Adi Vora | Vivien Roggero (co-author) |
| Revision 1 | 2026-05-08 | Specification created — full engineering text at target altitude with an explicit implemented-subset section. | Adi Vora | Vivien Roggero (co-author) |
| ADR-010 | retired | `.vio` as an OCI image with a manifest annotation. Superseded; recorded for provenance. | Adi Vora | — |

## Contributors by kind

| Kind | Names |
|---|---|
| Specification text | Vivien Roggero · Adi Vora |
| Reference implementation | Adi Vora |
| Review | None recorded yet beyond the editors |
| Implementations | None external yet — see the Ecosystem page |

## How to be listed

- **Propose a change** — accepted proposals credit the proposer on the revision that lands them.
- **Ship an implementation** — listed with its conformance level.
- **Review a revision** — review leading to a substantive change is credited on that revision.

See [CONTRIBUTING.md](CONTRIBUTING.md).
