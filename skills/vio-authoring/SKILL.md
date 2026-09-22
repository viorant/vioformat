---
name: vio-authoring
description: Author, review or debug a .vio artifact bundle — the signed, framework-neutral artifact format for AI agents. Use whenever a .vio file is involved: writing one from scratch, adding an artifact to an existing bundle, explaining why a bundle is rejected, reviewing a bundle's capability surface before deploy, or answering questions about manifest fields, trust tiers, reserved values, templated prompts, skill trees, model descriptors or memory layers. Also use when a user mentions vio, VIO, vioformat, a signed agent bundle, or asks how an agent gets packaged for deployment. Do not use for container images, Helm charts, or agent-description schemas such as Agent Format or ADL unless converting them into a .vio.
---

# Authoring a `.vio`

A `.vio` is a single self-contained YAML bundle carrying the artifacts an agent is composed of, plus the digests and
signatures that bind them. Read [`spec/v1/index.md`](../../spec/v1/index.md) for the normative text; this skill is
the working procedure.

## Before writing anything

1. Decide the `composition`. An `agent` bundle is runnable. A lone `prompt`, `skill`, `memory` or `model` bundle
   deploys to a registry or store, not a runtime.
2. List the artifacts. Every one gets a bundle-local `id`, a `type`, a `deploy` destination and a `digest`.
3. Apply the embed-versus-reference rule: small text embeds inline; **models always reference**; heavy or
   multi-file skill trees reference.

## The five rules that are most often broken

1. **You sign what you author; you digest-pin what you reference or what is mutable.** `prompt`, `skill` and
   `agent` carry a `sig`. `memory` and `model` carry a `digest` and never a `sig`. Adding a `sig` to a memory or
   model artifact is a rejection, not a nicety.
2. **A model is a reference plus a descriptor, never weights.** `ref: model://…`, `digest`, and the inference
   descriptor (`engine`, `quantization`, `context_length`, `served_as`) on the manifest index entry. A hosted LLM
   is *not* `type: model` — it rides the connector rail as a control-plane connection.
3. **Credentials never enter the file.** Use `secret://org/team/key` and `connection://org/team/connector` handles.
   A literal key in a binding is non-conforming regardless of signatures.
4. **A skill's `tools` declaration is inside its signature, and every MCP connector it uses must also appear in
   `manifest.requires[]` with at least the scopes the skill requests.** Requesting a scope beyond `requires[]` is a
   widened capability surface and is rejected.
5. **Prompts are templates, not rendered strings.** Every `{{slot}}` in `content` must be declared in
   `variables[]` with a `source`. Bind at the artifact level so the prompt is self-runnable; let the agent override
   via its own `bindings` if it needs to.

## Reserved values — anything else is rejected

| Field | Values |
|---|---|
| `manifest.composition` | `agent` `prompt` `skill` `memory` `model` `bundle` |
| `artifacts[].type` | `prompt` `skill` `memory` `model` `agent` |
| `artifacts[].deploy` | `runtime` `runtime/standalone` `registry` `store` |
| `skill.kind` / `skill.runtime` | `declarative` `executable` / `python` `js` |
| `variables[].source` | `input` `env` `task` `connector` `secret` `static` |
| `tools[].kind` | `viorant` `mcp` |
| `prompt.mode` | `chat` `single_shot` |
| `memory.layer` | `seed` (default) `runtime` |

## Memory layers

A memory body declares `layer: seed` (curated, ships its text) or `layer: runtime` (agent-local scratch, ships
frontmatter only). Omitted means `seed`. Layer is a property of the **asset**, never derived from how an agent binds
it — a write-bound seed memory is promoted to a runtime copy on first write, never mutated in place.

## Plain-YAML guarantee

Portable YAML core only: block scalars for bodies, base64 for signatures, plain scalars, maps and sequences.
**No anchors, aliases, custom `!tags`, merge keys or binary framing.** When editing a bundle, preserve block
scalars byte-for-byte — rewriting `|` to `|-` or trimming a trailing newline changes the body string, the digest and
the signature.

## Checking your work

```bash
cd tools/vio-lint && npm install
node index.js path/to/bundle.vio
```

The linter implements Level 1 (Reader) and nothing beyond it. It never reports a bundle as verified — verifying a
`sig` is Level 2 and belongs to Viorant Sign.

## Worked references

- [`examples/valid/skill_tree.vio`](../../examples/valid/skill_tree.vio) — a prompt, a declarative skill and an agent
- [`examples/valid/memory_layers.vio`](../../examples/valid/memory_layers.vio) — both memory layers and the agent binding
- [`examples/valid/minimal_prompt.vio`](../../examples/valid/minimal_prompt.vio) — smallest conforming bundle
- [`examples/valid/memory_layers.vio`](../../examples/valid/memory_layers.vio) — both memory layers
- [`examples/invalid/`](../../examples/invalid/) — one violation per file, each citing the section it breaks
