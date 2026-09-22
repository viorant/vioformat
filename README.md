# `.vio` — the signed artifact format for AI agents

**VIO — Verifiable Intelligence Object.** An open, signed, framework-neutral artifact format for AI agents.
One YAML document carries what an agent knows, does and remembers — and the signatures that prove who authored it.

- Specification: [`spec/v1/index.md`](spec/v1/index.md) · format version 1 · revision 4 · 2026-09-04
- Website: <https://vioformat.org> (source in [`site/`](site/))
- Repository: <https://github.com/viorant/vioformat>
- Signing and verification: Viorant Sign — <https://sign.viorant.ai> *(optional; coming soon)*

Maintained by **the VIO Project**. Patent pending.

---

## What a `.vio` is

A single self-contained, signed bundle of the artifacts an agent is composed of. It is the unit a conforming
deployer consumes: a manifest, the artifact bodies (or references to them), and the signatures that bind them.

Five artifact types, two trust tiers:

| Type | Tier | In the file |
|---|---|---|
| `prompt` | signed | `sig` present |
| `skill` | signed | `sig` present |
| `agent` | signed | `sig` present; the bundle is a Sign `vio_bundle` |
| `memory` | integrity only | `digest` only — mutable user data, with an inline body and a `layer` |
| `model` | integrity only | `digest` + `ref` only — weights you cannot author-sign |

You sign what you author; you digest-pin what you reference or what is mutable.

Other open efforts describe an agent as a schema. The `.vio` artifact format occupies the layer after that one:
packaging, pinning and provenance for the thing you actually deploy. A describing format is a natural conversion
source, not a competitor.

## Repository layout

```
spec/v1/          the specification, normative
spec/adr/         architecture decision records the spec derives from
schema/v1/        JSON Schema for a .vio bundle (structural, non-normative) — GENERATED
examples/valid/   bundles that must be accepted — the bundles the reference
                  implementation actually produces, copied verbatim
examples/invalid/ bundles that must be rejected, one violation each — GENERATED
conformance/v1/   the conformance case manifest — file + expected outcome
registry/         adapter id registry — open registration, not gated by any implementation
tools/vio-lint/   reference Level 1 linter — structure from the generated schema, plus
                  the cross-cutting rules and digest verification
tools/            sync-schema.mjs and build-fixtures.mjs — the generators
skills/           AI skills for authoring and reviewing .vio bundles
site/             source of vioformat.org — one self-contained HTML file
```

## Quick start

Read a bundle with the parser you already have — the format restricts itself to the portable YAML core,
so no format-specific tooling is required:

```python
import yaml
b = yaml.safe_load(open("examples/valid/skill_tree.vio"))
for a in b["manifest"]["artifacts"]:
    print(a["id"], a["type"], a["deploy"], "sig" in a)
```

Lint one:

```bash
cd tools/vio-lint && npm install
node index.js ../../examples/valid/minimal_prompt.vio
```

Every artifact body is re-digested and compared against its manifest entry, so a bundle whose content was
edited after export is rejected rather than quietly accepted.

## Status

| Area | State |
|---|---|
| Manifest, artifact index, embedded bodies | shipped |
| Templated artifacts — sections, variables, bindings, two-facet output | shipped |
| Memory bodies with `layer` | shipped |
| Models rail and connector rail | shipped |
| CrewAI adapter | shipped |
| Per-artifact `sig` and the `vio_bundle` signature | specified |
| Off-machine deploy — gates and destinations | specified |
| Adapter bindings for memory providers and deployment targets (ADR-038) | proposed — rev 5 |
| LangChain · AutoGen · ACP · Claude SDK · Vercel AI SDK · Google ADK adapters | planned |
| Multi-agent `composition: bundle` | open |

## Adapters

A `.vio` **declares** which framework, memory provider or deployment target it expects; a deployer **implements**
that expectation as an adapter. Adapters are not part of the format.

Adapter ids are the format's one open value set: a reader accepts an id it does not recognise, and a deployer that
lacks the adapter fails explicitly rather than substituting. Ids are registered in [`registry/`](registry/) —
**anyone may register, and registration is not gated by any implementation.**

Write an adapter against the open SDK: <https://github.com/viorant/helix-adapter-sdk> (Apache-2.0).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [GOVERNANCE.md](GOVERNANCE.md).
Authorship per revision is recorded in [CONTRIBUTORS.md](CONTRIBUTORS.md).

## Licensing

| What | Licence |
|---|---|
| Specification, schema, examples, conformance fixtures, adapter registry | [CC-BY-4.0](spec/LICENSE) |
| Reference tooling, skills, website source | [Apache-2.0](LICENSE) |
| Patent rights in the format | [Royalty-free non-assertion covenant](PATENTS.md), scoped to conforming implementations, reciprocal |
| `.vio` · VIO · the VIO Project · VIO Conformant | Trademarks of Viorant Inc. — **not licensed** by the above. See [TRADEMARKS.md](TRADEMARKS.md) |

Implementing the specification is free, worldwide, royalty-free, and requires no agreement with anyone. Claiming
**VIO Conformant** requires passing the conformance suite — and nothing else.

Apache-2.0 rather than MIT for the tooling, deliberately: MIT grants no patent rights, and a licensor holding a
reading patent leaves implementers exposed. Apache-2.0 §3 grants a patent licence and terminates it for anyone who
sues over patents.

## Citation

```bibtex
@techreport{vio-spec-2026,
  title       = {The .vio Artifact Specification},
  author      = {Roggero, Vivien and Vora, Adi},
  institution = {The VIO Project},
  year        = {2026},
  note        = {Format version 1, specification revision 4 (2026-09-04)},
  url         = {https://vioformat.org/spec}
}
```
