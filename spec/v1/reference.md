# Field reference

Every key the `.vio` artifact format defines, where it lives, and the values it reserves.
Machine-readable structural form: [`schema/v1/vio.schema.json`](../../schema/v1/vio.schema.json).

## Top level

| Path | Meaning | Values |
|---|---|---|
| `vio` | Format version, an integer. Readers reject versions they do not implement. | `1` |
| `manifest` | Authoritative metadata, signed as a unit. | |
| `artifacts` | The artifact bodies. Referenced artifacts have no body here. | |

## Manifest

| Path | Meaning | Values |
|---|---|---|
| `manifest.id` | Package identifier. | |
| `manifest.name` | Human-readable package name. | |
| `manifest.version` | Package version. Unrelated to the format version. | semver |
| `manifest.composition` | What the package is. | `agent` `prompt` `skill` `memory` `model` `bundle` |
| `manifest.framework` | For agents: the framework the adapter targets. | `crewai` `langchain` `autogen` `claude-sdk` `vercel-ai` `adk` (open set) |
| `manifest.org` · `manifest.team` | Scope. Drives trust, RBAC and registry namespace. | |
| `manifest.signer` | Who signed the bundle. | `{ certificate_id, algo_id }` |
| `manifest.signer.algo_id` | Signature algorithm per Sign. | `0x02` RSA-2048+ECDSA-P256 (default) · `0x04` Ed25519 · `0x03` with Dilithium |
| `manifest.created` | Creation timestamp. | ISO-8601 UTC |
| `manifest.artifacts[]` | Authoritative index, one descriptor per artifact. | |
| `manifest.requires[]` | Cross-artifact and connector dependencies. | `{ ref, digest }` · `{ connector, scopes[], auth }` |

## Artifact index entry

| Path | Meaning | Values |
|---|---|---|
| `artifacts[].id` | Bundle-local identifier siblings reference. | |
| `artifacts[].type` | Artifact type. | `prompt` `skill` `memory` `model` `agent` |
| `artifacts[].kind` | Sub-kind; for skills only today. | `declarative` `executable` |
| `artifacts[].runtime` | Executable skill runtime. | `python` `js` |
| `artifacts[].entry` | Executable skill entrypoint within its file tree. | e.g. `scripts/run.py` |
| `artifacts[].deploy` | Declared destination and mode. | `runtime` `runtime/standalone` `registry` `store` |
| `artifacts[].digest` | sha256 of the artifact's canonical content. | `sha256:…` |
| `artifacts[].sig` | Per-artifact signature. Authored artifacts only. | base64 |
| `artifacts[].ref` | External reference. Referenced artifacts only. | `model://…` `mem://…` git ref · OCI image |

## Model entry

| Path | Meaning | Values |
|---|---|---|
| `artifacts[].engine` | Inference runtime; selects the base image flavor. | `vllm` `llama.cpp` `ollama` … |
| `artifacts[].quantization` | Quantization of the served weights. Optional. | e.g. `q4_k_m` |
| `artifacts[].context_length` | Served context window. Optional. | integer |
| `artifacts[].served_as` | The name the agent calls the model by. Optional. | |
| `artifacts[].params` | Recommended decode parameters. Overridden by agent, then run. | `{ temperature, max_tokens, top_p, stop }` |

## Prompt body

| Path | Meaning | Values |
|---|---|---|
| `prompt.mode` | How the adapter assembles the prompt. | `chat` `single_shot` |
| `prompt.content.system` · `.user` | Sections, templates with `{{vars}}`. Inside the signature. | |
| `prompt.variables[]` | Dynamic-slot schema. Inside the signature. | `{ name, type, required, source, default, values }` |
| `variables[].source` | Where a value comes from at run. | `input` `env` `task` `connector` `secret` `static` |
| `prompt.bindings` | Artifact-level default binding of each variable. Overridable by an agent. | `name: input.name` · `key: secret://org/team/key` |

## Skill body

| Path | Meaning | Values |
|---|---|---|
| `skill.content` | Single-file skill body — shorthand for a one-file tree. | block scalar |
| `skill.files` | File tree keyed by relative path. Paths are inside the signature. | map |
| `skill.entry` | Entrypoint path within `files`. | |
| `skill.tools[]` | Declared capability surface. Inside the signature. | `{ ref, kind, connector?, scopes? }` |
| `tools[].kind` | Tool source. | `viorant` (native) · `mcp` (connector, OAuth) |
| `tools[].scopes` | Least-privilege scope list for an MCP tool. | e.g. `[search.read]` |

## Agent body

| Path | Meaning |
|---|---|
| `agent.content.role` · `.goal` | Framework-neutral role and goal. |
| `agent.content.model` | Sibling model reference plus agent-level decode params: `{ ref, params }`. |
| `agent.content.prompts[]` · `.skills[]` · `.memory` | Sibling references; skills accept a `deploy` override. |
| `agent.content.inputs[]` | Runtime input contract. A run omitting a required input fails before execution. |
| `agent.content.bindings` | Agent-level override of a prompt's bindings, recorded in the agent's signed content. |
| `agent.content.output.expected` | Prose expected output. Prompt-shaping. |
| `agent.content.output.schema` | Typed output contract (JSON Schema). Validates the result, wires `source: task`. |

## Memory body

| Path | Meaning | Values |
|---|---|---|
| `memory.layer` | Which memory layer the body is. Not part of the digest subject. | `seed` (default) `runtime` |
| `memory.content` | Inline `.memory.md` text with frontmatter. Digest covers `{ content }` only. | block scalar |

## URI schemes

| Scheme | Meaning |
|---|---|
| `model://org/name` | Self-hosted weights, resolved on the target at deploy and digest-checked. |
| `mem://org/team/name` | A memory store reference. |
| `secret://org/team/key` | A secret reference resolved at run. The value never enters the file. |
| `connection://org/team/connector` | A control-plane connection handle for connector credentials at run. |
