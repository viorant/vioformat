---
name: vio-authoring
description: Author, review or debug a .vio artifact bundle — the signed, framework-neutral artifact format for AI agents. Use whenever a .vio file is involved: writing one from scratch, adding an artifact to an existing bundle, explaining why a bundle is rejected, reviewing a bundle's capability surface before deploy, or answering questions about manifest fields, trust tiers, reserved values, templated prompts, skill trees, model descriptors or memory layers. Also use when a user mentions vio, VIO, vioformat, a signed agent bundle, or asks how an agent gets packaged for deployment. Do not use for container images, Helm charts, or agent-description schemas such as Agent Format or ADL unless converting them into a .vio.
---

# Authoring a `.vio`

A `.vio` is a single self-contained YAML bundle carrying the artifacts an agent is composed of, plus a digest for
each one. Read [`spec/v1/index.md`](../../spec/v1/index.md) for the normative text; this skill is the working
procedure for **VIO 1.0**.

**In 1.0 bundles are unsigned.** `sig` is reserved. Integrity rests entirely on digests, so a bundle whose digests
do not match its bodies is rejected — that is the check you will fail most often.

## Before writing anything

1. Decide the `composition`. An `agent` bundle is runnable. A lone `prompt`, `skill`, `memory` or `model` bundle
   deploys to a registry or store, not a runtime.
2. List the artifacts. Every one gets a bundle-local `id`, a `type`, a `deploy` destination and a `digest`.
3. Apply the embed-versus-reference rule: small text embeds inline; **models always reference**; heavy or
   multi-file skill trees reference.

## The rules that are most often broken

1. **Every digest must match its body.** `digest = sha256:` + SHA-256 of the RFC 8785 canonical JSON of the body
   **minus `id` and `type`**. Edit a body and you must recompute. Absent keys stay absent — never add an empty
   array or a default before digesting. `layer` is excluded from a memory subject. Do not hand-compute this; run
   the linter.
2. **`manifest.version` and `manifest.signer` are optional.** Do not add them to satisfy a half-remembered rule;
   the reference producer emits neither.
3. **`manifest.requires[]` connector entries need `kind` and `tools`.** Both required. `kind` is `model` or
   `connector` and is *independent* of `auth` — never infer one from the other. `tools` is the explicit list of
   tool names, never a wildcard, `[]` for `kind: model`.
4. **A hosted LLM is not an artifact.** The agent carries `model: { ref: provider://openai/gpt-4o-mini }`, and the
   credential is declared in `requires` with `kind: model`. `type: model` means self-hosted weights and is
   **reserved — not part of 1.0**.
5. **`manifest.framework` is a closed set of three**: `crewai`, `langchain`, `autogen`. `claude-sdk`, `vercel-ai`
   and `adk` are reserved names in the registry and **rejected values** in a bundle.
6. **The agent body requires `model`, `prompts`, `skills` and `inputs`** — the last two as `[]` when empty.
7. **Credentials never enter the file.** A literal key is non-conforming whatever else is true.
8. **A skill's `tools` declaration is inside its digest subject**, and every MCP connector it uses must appear in
   `manifest.requires[]` with at least the scopes and tools the skill requests.
9. **Prompts are templates.** `content` needs **both** `system` and `user`, and every `{{slot}}` must be declared
   in `variables[]` with a `source`.
10. **Quote anything whose YAML type depends on the parser** — timestamps, `0x` numbers, `yes`/`no`. A value that
    resolves differently in two parsers produces two different digests.
11. **`memory` and `model` never carry a `sig`.** Adding one is a rejection, not a nicety.

## Reserved values — anything else is rejected

| Field | Values |
|---|---|
| `manifest.composition` | `agent` `prompt` `skill` `memory` `model` `bundle` |
| `artifacts[].type` | `prompt` `skill` `memory` `model` `agent` |
| `artifacts[].deploy` | `runtime` `runtime/standalone` `registry` `store` |
| `skill.kind` / `skill.runtime` | `declarative` `executable` / `python` `js` |
| `manifest.framework` | `crewai` `langchain` `autogen` — **closed in 1.0** |
| `requires[].kind` / `requires[].auth` | `model` `connector` / `oauth` `api_key` |
| `variables[].type` | `string` `number` `boolean` `enum` `date` |
| `variables[].source` | `input` `env` `task` `connector` `secret` `static` |
| `tools[].kind` | `viorant` `mcp` |
| `prompt.mode` | `chat` `single_shot` |
| `memory.layer` | `seed` (default) `runtime` |

## Memory layers

A memory body declares `layer: seed` (curated, ships its text) or `layer: runtime` (agent-local scratch, ships
frontmatter only). Omitted means `seed`. Layer is a property of the **asset**, never derived from how an agent binds
it — a write-bound seed memory is promoted to a runtime copy on first write, never mutated in place.

## Plain-YAML guarantee

Portable YAML core only: block scalars for bodies, plain scalars, maps and sequences. **No anchors, aliases,
custom `!tags`, merge keys or binary framing.** When editing a bundle, preserve block scalars byte-for-byte —
rewriting `|` to `|-` or trimming a trailing newline changes the body string and therefore its digest.

**Every object is closed.** An unknown key is rejected, not ignored — so you cannot add a field "just for now".

## Checking your work

```bash
cd tools/vio-lint && npm install
node index.js path/to/bundle.vio
```

The linter implements Level 1 (Reader), which in 1.0 **includes recomputing every digest**. It never reports a
bundle as signature-verified — that is Level 2, and signing is not active.

## Worked references

- [`examples/valid/skill_tree.vio`](../../examples/valid/skill_tree.vio) — a prompt, a declarative skill and an agent
- [`examples/valid/memory_layers.vio`](../../examples/valid/memory_layers.vio) — both memory layers and the agent binding
- [`examples/valid/minimal_prompt.vio`](../../examples/valid/minimal_prompt.vio) — smallest conforming bundle
- [`examples/valid/oauth_connector.vio`](../../examples/valid/oauth_connector.vio) — an OAuth MCP connector
- [`examples/invalid/`](../../examples/invalid/) — one violation per file, each citing the section it breaks
