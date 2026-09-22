# Field reference — VIO 1.0

Every key the `.vio` artifact format defines in version 1, where it lives, and the values it reserves.
Machine-readable structural form: [`schema/v1/vio.schema.json`](../../schema/v1/vio.schema.json), generated from
the reference implementation.

**R** marks a required field. Every object is closed: a key not listed here is rejected, not ignored.

## Top level

| Path | R | Meaning | Values |
|---|---|---|---|
| `vio` | ● | Format version, an integer. Readers reject versions they do not implement. | `1` |
| `manifest` | ● | Authoritative metadata: identity and the artifact index. | |
| `artifacts` | ● | The artifact bodies. A model entry has none. | |

## Manifest

| Path | R | Meaning | Values |
|---|---|---|---|
| `manifest.id` | ● | Bundle identifier. | |
| `manifest.name` | ● | Human-readable name. | |
| `manifest.composition` | ● | What the bundle is. | `agent` `prompt` `skill` `memory` `model` `bundle` |
| `manifest.created` | ● | Creation timestamp. **Quote it.** | ISO-8601 |
| `manifest.artifacts[]` | ● | Authoritative index, one descriptor per artifact. | |
| `manifest.framework` | | The framework the adapter targets. **Closed set in 1.0.** | `crewai` `langchain` `autogen` |
| `manifest.version` | | Optional version label. The reference producer does not set it. | |
| `manifest.requires[]` | | Credentials and connectors needed at deploy. | |
| `manifest.org` · `manifest.team` | | Reserved; no org concept in 1.0. | |
| `manifest.signer` | | Reserved; signing is not active. | `{ certificate_id, algo_id }` |

## Artifact index entry

| Path | R | Meaning | Values |
|---|---|---|---|
| `artifacts[].id` | ● | Bundle-local identifier; matches the body's `id`. | |
| `artifacts[].type` | ● | Artifact type. | `prompt` `skill` `memory` `model` `agent` |
| `artifacts[].deploy` | ● | Declared destination. | `runtime` `runtime/standalone` `registry` `store` |
| `artifacts[].digest` | ● | Digest of the body's canonical subject (§2.2). | `sha256:<hex>` |
| `artifacts[].sig` | | **Reserved.** Authored types only; reported unverified. Rejected on memory and model. | |
| `artifacts[].ref` | | Optional external locator. Required on a model entry. | |
| `artifacts[].kind` | | Skill sub-kind. | `declarative` `executable` |
| `artifacts[].runtime` | | Executable skill runtime. | `python` `js` |
| `artifacts[].entry` | | Executable skill entrypoint. | e.g. `scripts/run.py` |

Model entries additionally accept `engine`, `quantization`, `context_length` and `served_as` — reserved in 1.0.

## `manifest.requires[]`

Two shapes. The connector shape is the one 1.0 uses; **every field is required**.

| Path | R | Meaning | Values |
|---|---|---|---|
| `connector` | ● | MCP server URL for `kind: connector`; provider name for `kind: model`. | |
| `scopes` | ● | Scopes to request. `[]` when none. | |
| `auth` | ● | Which credential is needed. | `oauth` `api_key` |
| `kind` | ● | Entry discriminator. **Independent of `auth`.** | `model` `connector` |
| `tools` | ● | Exact tool names the agent may call. Never a wildcard. `[]` for `kind: model`. | |

The second shape, `{ ref, digest }`, pins an in-bundle model artifact — reserved in 1.0.

## Prompt body

| Path | R | Meaning | Values |
|---|---|---|---|
| `mode` | ● | How the adapter assembles the prompt. | `chat` `single_shot` |
| `content.system` | ● | System prompt text. | |
| `content.user` | ● | User prompt template; may contain `{{vars}}`. | |
| `variables[]` | | Dynamic-slot schema. | `{ name, type, required, source, default?, values?, description? }` |
| `variables[].type` | ● | Value type. | `string` `number` `boolean` `enum` `date` |
| `variables[].source` | ● | Where the value comes from at run. | `input` `env` `task` `connector` `secret` `static` |
| `bindings` | | Name-to-value bindings. | |

## Skill body

| Path | R | Meaning | Values |
|---|---|---|---|
| `content` | ◐ | Single-file skill: the full `SKILL.md`. | block scalar |
| `files` | ◐ | Multi-file skill: path → content. Must include `SKILL.md`. | map |
| `entry` | | Entrypoint path within `files`. | |
| `tools[]` | | Declared capability surface. Inside the digest subject. | |
| `tools[].kind` | ● | Tool source. | `viorant` `mcp` |
| `tools[].connector` · `.scopes` | ● | Required on an `mcp` tool. | |

◐ — `content` or `files`; at least one. JSON Schema cannot express this; a conforming reader enforces it.

## Agent body

| Path | R | Meaning |
|---|---|---|
| `content.model` | ● | `{ ref, params? }`. `ref` is `provider://{provider}/{model_id}`. |
| `content.prompts[]` | ● | Prompt references. The first is the persona. |
| `content.skills[]` | ● | Skill references; `[]` when none. |
| `content.inputs[]` | ● | Runtime input contract: `{ name, type, required, description? }`. |
| `content.role` · `.goal` | | Framework-neutral role and goal. |
| `content.framework` | | The framework the adapter targets. |
| `content.memory` | | `{ read[], write[] }` — `write` holds at most one id. |
| `content.bindings` | | Agent-level override of a prompt's bindings. |
| `content.output.expected` | | Prose expected output; shapes prompt assembly. |
| `content.output.schema` | | Typed output contract (JSON Schema). |

## Memory body

| Path | R | Meaning | Values |
|---|---|---|---|
| `content` | ● | Raw `.memory.md` text, verbatim. Max 100,000 characters. | block scalar |
| `layer` | | Which layer this body is. **Outside the digest subject.** | `seed` (default) `runtime` |

## URI schemes

| Scheme | State | Meaning |
|---|---|---|
| `provider://{provider}/{model_id}` | **1.0** | A hosted model. The credential is resolved at deploy and never enters the bundle. |
| `model://org/name` | reserved | Self-hosted weights. Not part of 1.0. |
| `mem://org/team/name` | reserved | A memory store reference. 1.0 memory ships inline. |
| `secret://org/team/key` | reserved | A secret resolved at run. |
| `connection://org/team/connector` | reserved | A control-plane connection handle. |

## Digest subject, per type

The body minus `id` and `type`, canonicalized per RFC 8785. Absent keys stay absent.

| Type | Subject |
|---|---|
| `prompt` | `mode`, `content`, plus `variables` / `bindings` when present |
| `skill` | `entry`, `content`, `files`, `tools` — each when present |
| `agent` | `content` |
| `memory` | `content` only — **`layer` excluded** |
| `model` | No body; the entry's `digest` is carried as supplied |
