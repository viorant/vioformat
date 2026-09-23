# The `.vio` Artifact Specification — VIO 1.0

**Status:** Accepted · **Format version:** 1 · **Revision:** 5 · **Date:** 2026-09-22
**Project:** the VIO Project · **Authors:** Vivien Roggero, Adi Vora
**Canonical:** <https://vioformat.org/spec>

The portable deployment artifact for AI agents. A `.vio` is what gets handed from "the engineer composed this
agent" to "this agent is running somewhere."

> **This revision describes the format as it is implemented and frozen.** Revisions 1–4 were written at a target
> altitude — all five artifact types, six frameworks, org and team scope, active signing — with an
> "implemented subset" section carved out of it. That framing produced a document that disagreed with every bundle
> the reference implementation actually emits. **VIO 1.0 is the locked format**, and this text describes it and
> nothing else. What is designed but not built now lives in [§6](#6-reserved-for-a-future-format-version),
> explicitly labelled as not part of 1.0. See [errata.md](errata.md) `E-004`.

> **History.** An earlier draft defined `.vio` as an OCI image carrying an `org.viorant.manifest.v1` annotation.
> That model is retired; OCI images are the deployer's pre-baked base images, not the `.vio`. See `E-001`.

---

## What a `.vio` is

A `.vio` is a **single self-contained bundle** of the artifacts an agent is composed of. It is the unit a conforming
deployer consumes: a manifest, the artifact bodies, and a digest for every one of them.

Three concerns stack — none reinvents the others:

```
Sign      = how an artifact or bundle is signed and verified   → reserved in 1.0, not active
.vio      = how artifacts are packaged and pinned together     → this document
Deployer  = verifies the .vio, then deploys                    → deployer specification
```

**In 1.0 a bundle is unsigned.** `sig` is reserved on authored index entries and a reader reports a present
signature as *unverified* rather than passing it quietly. Integrity in 1.0 rests entirely on **digests**
([§2](#2-digests-and-integrity)) — which is why the digest subject is specified here in full, rather than gestured
at. An implementer who cannot reproduce a digest cannot produce a bundle this format accepts.

---

## 1. Physical format

- **Encoding.** A single UTF-8 **YAML** document. Chosen over JSON because every artifact body is multi-line text —
  prompts, skills, memory, agent definitions — and YAML block scalars keep them verbatim and diff-able instead of
  base64 or escaped one-liners. Chosen over an archive because `.vio` is a first-class format, not a renamed
  container.
- **Top-level keys.** Exactly three: `vio` (format-version integer), `manifest`, `artifacts`. Nothing else.
- **Plain-YAML guarantee.** A `.vio` uses only the portable YAML core — UTF-8, block scalars for bodies, plain
  scalars, maps and sequences. **No anchors or aliases, no custom `!tags`, no merge keys (`<<`), no binary
  framing.** Any YAML parser can open a `.vio` with no format-specific tooling.
- **Quote anything whose type depends on the parser.** The plain-YAML guarantee is a claim about *every* parser, so
  a value must not resolve differently between them. Timestamps (`2026-06-14T10:00:00Z`), `0x`-prefixed numbers
  (`0x02`), and `yes`/`no`/`on`/`off` resolve to different types under YAML 1.1 and the YAML 1.2 core schema.
  **Quote them.** `created: '2026-09-22T00:00:00.000Z'` is conforming; the same value unquoted is not. A reader
  that resolves a body differently from its producer computes a different digest and rejects a bundle that was
  never tampered with. The reference linter checks this by parsing each document under two YAML cores and
  comparing.
- **Every object is closed.** An unknown key is **rejected**, never ignored — at the top level, in the manifest, in
  every index entry and every body. This is what makes a reader fail loudly on something it does not understand,
  and it is why the format has no extension point ([§7](#7-versioning-and-compatibility)).

### 1.1 The embed-versus-reference rule

A single text document cannot hold model weights or multi-file binary code. So:

| Case | Representation |
|---|---|
| Text — prompt, skill, agent definition, memory body | **Embedded inline** as a YAML block scalar |
| Hosted LLM | **Not an artifact.** A `provider://` ref on the agent plus a credential declared in `requires` ([§1.7](#17-models)) |
| Self-hosted weights, heavy binary trees | Reserved, not part of 1.0 ([§6](#6-reserved-for-a-future-format-version)) |

### 1.2 Manifest

| Field | Required | Meaning |
|---|---|---|
| `id` | **yes** | Bundle id. For an agent bundle, conventionally the agent artifact's id |
| `name` | **yes** | Human-readable name |
| `composition` | **yes** | `agent` \| `prompt` \| `skill` \| `memory` \| `model` \| `bundle` |
| `created` | **yes** | ISO-8601 timestamp, **quoted** |
| `artifacts[]` | **yes** | The authoritative index — one entry per artifact, each with its digest |
| `framework` | no | `crewai` \| `langchain` \| `autogen`. Required in practice to serve an agent bundle |
| `version` | no | Optional version label. **The reference producer does not set it** |
| `requires[]` | no | Credentials and connectors the agent needs at deploy time |
| `org`, `team` | no | Reserved; no org concept in 1.0 |
| `signer` | no | Reserved; signing is not active |

> **`version` and `signer` are optional.** Revisions 1–4 marked both required. They are not, and the bundles the
> reference implementation produces carry neither.

**`framework` is a closed set of three in 1.0.** A conforming reader accepts `crewai`, `langchain` and `autogen`
and **rejects every other value**, including adapter ids reserved in the registry such as `claude-sdk`,
`vercel-ai` and `adk`. Registering an adapter id reserves the *name*; it does not make a 1.0 reader accept it as a
`framework` value. Widening this set is a format change ([§7](#7-versioning-and-compatibility)).

### 1.3 Artifact index entry

Each row in `manifest.artifacts[]` is the authoritative descriptor for one artifact. All entries carry `id`,
`type`, `deploy` and `digest`.

| Key | Applies to | Meaning |
|---|---|---|
| `id` | all | Bundle-local id; siblings reference it, and it matches the body's `id` |
| `type` | all | `prompt` \| `skill` \| `memory` \| `model` \| `agent` |
| `deploy` | all | `runtime` \| `runtime/standalone` \| `registry` \| `store` |
| `digest` | all | `sha256:<hex>` of the body's canonical subject ([§2.2](#22-the-digest-subject)) |
| `sig` | prompt, skill, agent | **Reserved.** Signing is not active; a present signature is reported unverified |
| `ref` | any | Optional external locator |
| `kind`, `runtime`, `entry` | skill | `declarative` \| `executable`; `python` \| `js`; entry path |
| `engine`, `quantization`, `context_length`, `served_as` | model | Inference descriptor ([§6](#6-reserved-for-a-future-format-version)) |

**A memory or model entry may not carry `sig`** — they are the integrity-only tier
([§2.1](#21-two-tier-trust)) and a reader rejects one that does.

The reference producer emits `deploy` as: prompt → `registry`, skill → `runtime`, memory → `store`,
agent → `runtime`.

### 1.4 Worked examples

- [`examples/valid/minimal_prompt.vio`](../../examples/valid/minimal_prompt.vio) — the smallest deployable agent:
  one prompt, one hosted model, no tools.
- [`examples/valid/skill_tree.vio`](../../examples/valid/skill_tree.vio) — a declarative skill alongside its prompt
  and agent.
- [`examples/valid/oauth_connector.vio`](../../examples/valid/oauth_connector.vio) — an agent calling an OAuth MCP
  connector; no token anywhere in the bundle.
- [`examples/valid/memory_layers.vio`](../../examples/valid/memory_layers.vio) — both memory layers and the agent's
  read/write binding.

These are the bundles the reference implementation produces, copied verbatim with their digests intact. Every one
is checked by the conformance suite, digests included.

Three properties of this design:

1. **Self-describing.** The agent body references siblings by local `id`; the deployer wires them at deploy. No
   external lookup is needed to understand composition.
2. **Per-artifact `deploy`.** Routing is declared, not inferred.
3. **Unknown values are reserved, and rejected cleanly.** A reader that does not understand a `type`, `framework`,
   `deploy` or `kind` value rejects rather than mis-deploying.

> **Correction (revision 5).** Property 3 previously concluded *"The format grows without breaking older
> deployers."* That is false and has been removed. It is true of unknown **values** in a closed set, which reject
> cleanly; it is not true of unknown **keys**, which also reject — so a bundle carrying a new field is rejected by
> every reader built before that field existed. The format does **not** grow without breaking older deployers.
> See [§7](#7-versioning-and-compatibility) and errata `E-005`.

### 1.5 Prompts

A prompt is a **template, not a finished string**. Its `content` is framework-neutral sections that an adapter
assembles into the native form at instantiate.

| Field | Required | Meaning |
|---|---|---|
| `mode` | **yes** | `chat` \| `single_shot` |
| `content.system` | **yes** | System prompt text |
| `content.user` | **yes** | User prompt template; may contain `{{variable}}` placeholders |
| `variables[]` | no | The dynamic-slot schema |
| `bindings` | no | Name-to-value bindings |

> **Both `system` and `user` are required strings.** A prompt with only a system section is not conforming in 1.0.

**Variable schema** — each entry is `{ name, type, required, source }` plus optional `default`, `values`,
`description`. `type` ∈ `string | number | boolean | enum | date`. `source` ∈ `input | env | task | connector |
secret | static`:

- `input` — supplied by the caller at each run. The agent aggregates unbound `input` variables into its `inputs`
  contract.
- `env` / `task` / `connector` — resolved by the system: deploy environment, upstream task output, tool result.
- `secret` — a reference resolved at run from a secret store; the value never enters the `.vio`.
- `static` — fixed at compose time.

Every `{{slot}}` appearing in `content` must be declared in `variables[]`. An undeclared slot can never be bound,
so the run fails after verification rather than before it.

**Why templates, not finished strings.** Values bind at run, outside the digested subject — so one template serves
every run without re-export, and the structure an implementer verifies is the structure that executes.

### 1.6 Skills and tools

A skill is either a single `SKILL.md` or a file tree.

| Field | Meaning |
|---|---|
| `content` | Single-file skill: the full `SKILL.md` text, starting with `name` and `description` frontmatter |
| `files` | Multi-file skill: a path → content map. Must include `SKILL.md` |
| `entry` | Entry file of an executable skill |
| `tools[]` | The tools the skill uses |

**A skill body must carry `content` or `files`.** JSON Schema cannot express that rule, so a generic validator will
not enforce it; a conforming reader does.

Tools come in two kinds:

| `kind` | Source | Auth |
|---|---|---|
| `viorant` | Native capability provided by the runtime or base image | None |
| `mcp` | A tool exposed by an MCP connector | Resolved per deployment on the control plane |

```yaml
tools:
  - { ref: http_get,      kind: viorant }
  - { ref: notion-search, kind: mcp, connector: 'https://mcp.notion.com/mcp', scopes: [] }
```

**Connectors are control-plane references, never packaged in the `.vio`.** The bundle surfaces its dependencies at
the manifest level so a deployer can gate and resolve auth without parsing every skill body:

```yaml
manifest:
  requires:
    - connector: 'https://mcp.notion.com/mcp'
      scopes: []
      auth: oauth
      kind: connector
      tools: [notion-search]
```

Every field is **required** on a connector-shaped `requires` entry:

| Field | Meaning |
|---|---|
| `connector` | For `kind: connector`, the MCP server URL. For `kind: model`, the provider name |
| `scopes` | Scopes to request; `[]` when none are needed |
| `auth` | `oauth` \| `api_key` — which credential the dependency needs |
| `kind` | `model` \| `connector` — **independent of `auth`**; an MCP connector may authenticate by `api_key`, so never infer one from the other |
| `tools` | The exact tool names the agent may call. **Never a wildcard, never absent.** `[]` for `kind: model` |

> `kind` and `tools` are required and were absent from revisions 1–4. A bundle without them is not conforming.

**Capability is declared; credentials are not.** A skill's `tools` declaration is inside its digest subject, so the
capability surface is tamper-evident — you cannot add a tool or widen a scope without changing the digest.
Credentials never enter the `.vio`: they are held by the deployment's control plane and injected at run.

### 1.7 Models

**In 1.0 an agent runs on a hosted LLM, and a hosted LLM is not an artifact.** The agent names it by a
`provider://` ref, and the credential it needs is declared in `manifest.requires` with `kind: model`:

```yaml
# agent body
model:
  ref: provider://openai/gpt-4o-mini
  params: { temperature: 0.2 }      # optional

# manifest
requires:
  - { connector: openai, scopes: [], auth: api_key, kind: model, tools: [] }
```

| Scheme | Meaning |
|---|---|
| `provider://{provider}/{model_id}` | A hosted model. The credential is resolved at deploy; the key never enters the bundle |

`params` are provider parameters (`temperature`, `max_tokens`, …) and are **config, not secrets** — they sit inside
the agent's digested content. A prompt stays sampling-neutral, so parameters are never prompt-level.

`type: model` artifacts describe **self-hosted weights** and are reserved, not part of 1.0
([§6](#6-reserved-for-a-future-format-version)).

### 1.8 Memory

A memory artifact ships its `.memory.md` text inline. A workspace holds two structurally identical kinds of
memory — a curated seed the user authored, and an agent's local runtime scratch — so the body declares which it is.

| Field | Required | Meaning |
|---|---|---|
| `content` | **yes** | Raw `.memory.md` text, verbatim. **At most 100,000 characters** |
| `layer` | no | `seed` \| `runtime`. **Omitted means `seed`** |

- **Omitted means `seed`.** A pre-`layer` bundle parses unchanged and reads as curated content, which is what those
  bundles carried.
- **It lives on the body, not the index entry.** The body is where the deployer reads from.
- **It is not part of the digest subject.** A memory artifact digests `{ content }` only, so adding or changing
  `layer` leaves every existing digest valid.
- **Materialization is layer-driven.** A deployer writes `seed` → `{id}.memory.md` at the memory root and
  `runtime` → `.runtime/{id}.memory.md`, so an instance classifies each memory on its first run rather than only
  after its first write.
- **A `runtime` body ships frontmatter-only, but it still ships.** The accumulated history stays local while the
  id binding survives. Omitting the artifact is not an equivalent optimization: an absent write target fails the
  first run with a dangling reference.

**The agent's binding is separate from the layer.** `agent.content.memory` declares what the agent reads and
writes:

```yaml
memory:
  read:  [01M1NC0WFNSS0WWN1690VY2FR8, 01KYRN79YYQ841RD37EKSMGKK9]
  write: [01KYRN79YYQ841RD37EKSMGKK9]
```

`read` is any number of ids; **`write` holds at most one**. Ids are the memory artifacts' ids.

> **Why the layer is declared rather than derived from the binding.** Layer is a property of the *asset* (curated
> versus scratch); binding is a property of the agent's *reference* to it. A seed-layer memory can legitimately be
> write-bound, in which case the runtime promotes a copy into the runtime layer on first write rather than mutating
> the seed. Deriving layer from binding would blank a curated memory the moment an agent wrote to it.

### 1.9 The agent

A deployable bundle has exactly one agent body.

| Field | Required | Meaning |
|---|---|---|
| `model` | **yes** | `{ ref, params? }` — the hosted LLM ([§1.7](#17-models)) |
| `prompts[]` | **yes** | Prompt references. At least one; the first is the agent's persona |
| `skills[]` | **yes** | Skill references. `[]` for an agent without skills |
| `inputs[]` | **yes** | Fields a caller supplies when running the deployed agent |
| `role`, `goal` | no | Framework-neutral role and goal |
| `framework` | no | The framework the adapter targets |
| `memory` | no | The read/write binding ([§1.8](#18-memory)) |
| `bindings` | no | Agent-level override of a prompt's bindings |
| `output` | no | `{ expected?, schema? }` — prose expectation and an optional JSON Schema contract |

> `model`, `prompts`, `skills` and `inputs` are **all required**, including as empty arrays where that is
> meaningful. Revisions 1–4 left the agent body loosely sketched; this is its normative shape.

**Output is an agent field, not a prompt field.** A prompt is reusable across agents with different expected
outputs, so the contract lives on the agent. `output.expected` is prose and shapes prompt assembly;
`output.schema` is a typed contract the runtime uses to validate the result.

---

## 2. Digests and integrity

### 2.1 Two-tier trust

> You digest everything. You **sign what you author** — when signing is active — and you **never sign what is
> mutable or what you did not author.**

| Artifact | Tier | In the file |
|---|---|---|
| `prompt` · `skill` · `agent` | Authored | `digest`; `sig` reserved |
| `memory` | Integrity only | `digest` only — mutable user data; a `sig` is **rejected** |
| `model` | Integrity only | `digest` + `ref` only — weights you cannot author-sign; a `sig` is **rejected** |

### 2.2 The digest subject

**This is the load-bearing rule of VIO 1.0.** Signing is not active, so the digest is the only thing standing
between a bundle and a body edited after export. An implementation that computes it differently cannot produce or
verify a conforming bundle.

```
digest = "sha256:" + hex( SHA-256( UTF-8( JCS( subject(body) ) ) ) )
```

- **JCS** is RFC 8785 JSON Canonicalization: object keys sorted by UTF-16 code unit, no insignificant whitespace,
  ECMAScript number and string serialization. No Unicode normalization is applied.
- **`subject(body)` is the body minus `id` and `type`**, projected per artifact type. `id` is bundle-local naming,
  not content — renaming an artifact must not invalidate its digest. `type` is already carried by the index entry
  that holds the digest, so including it would bind the same fact twice.

| Type | Subject |
|---|---|
| `prompt` | `mode`, `content`, and `variables` / `bindings` **when present** |
| `skill` | `entry`, `content`, `files`, `tools` — each **when present** |
| `agent` | `content` |
| `memory` | `content` only — **`layer` is excluded** |
| `model` | No body, no computed digest. The entry's `digest` is carried as supplied |

**Absent keys stay absent.** A key that the producer omitted must not be injected before digesting — not as an
empty array, not as a schema default. Injecting one changes the JCS bytes and therefore the digest. This is why
`variables`, `bindings`, `memory` and the rest are optional rather than defaulted, and why `layer` sits outside
the memory subject: it was added after bundles were already deployed, and including it would have invalidated
every digest in the field.

**`tools` is inside the skill subject** deliberately: widening a connector scope must change the digest rather
than riding along under an unchanged one.

### 2.3 Why digest-only is still tamper-evident

A model cannot be author-signed, but its `digest` sits inside the manifest. Tampering with the resolved bytes on
the target changes their hash and the manifest no longer matches. Reference-only artifacts therefore get
**integrity without authorship**: provenance is not claimed, but tampering is caught.

### 2.4 Signing — reserved, not active

`sig` is reserved on authored index entries. A reader that encounters one **reports it as unverified** rather than
treating the artifact as verified. Activating signing — the ceremony, key registry, verification engine and
enforcement gate — is future work ([§6](#6-reserved-for-a-future-format-version)).

---

## 3. The update lifecycle

A deployed agent is **replaced in place** by deploying a new bundle to the same deployment. What that replaces and
what it preserves is part of the format's contract, because a deployer that gets it wrong destroys user data.

**Replaced:** every authored artifact — the agent, its prompts, its skills — and every `seed`-layer memory body.
A redeploy refreshes curated content, which is the point of curating it.

**Preserved:** accumulated `runtime`-layer state. A deployer **checks whether a runtime memory object already
exists before writing it**, and skips the write if so, emitting a preservation notice instead.

**The ordering is load-bearing.** The existence check runs *before* the write. A check performed afterwards
reports a preservation that did not happen — it observes the file the write just created. An implementation that
checks after writing will pass a naive test and silently destroy every agent's accumulated memory on its first
redeploy.

A `runtime` body in the bundle is a **declaration that the write target must exist**, not content to install. On
first deploy it is materialized empty; on every subsequent deploy it is left alone.

---

## 4. Conformance

See [conformance.md](conformance.md) for the levels. In 1.0 a **Level 1 (Reader)** implementation must:

1. Reject a `vio` value it does not implement.
2. Reject any unknown key, at any depth.
3. Reject any value outside a closed set.
4. **Recompute every digestable body's digest and reject a mismatch.**
5. Reject a `sig` on a memory or model entry.
6. Reject a body with no index entry, and an index entry with neither body nor `ref`.
7. Reject a document that does not parse identically under the YAML 1.1 and YAML 1.2 core schemas.
8. Report a present `sig` as unverified rather than as verified.

Fixtures and expected outcomes: [`conformance/v1/cases.yaml`](../../conformance/v1/cases.yaml).

---

## 5. What is in VIO 1.0

The complete implemented surface:

- A **workspace compiles to a `.vio`**: tree-shake to what the composed agent reaches, resolve id-bound refs,
  serialize to the YAML bundle above.
- **Run is compile-then-run, always, through `.vio`.** A local run compiles to an unsigned in-memory bundle and
  hands it to the runner, so what runs locally is the artifact shape that later deploys.
- **Deploy** to a local container or to a hosted target, and **redeploy** in place ([§3](#3-the-update-lifecycle)).
- Prompt, skill, agent and memory bodies; the artifact index and digests; hosted models via `provider://`; MCP
  connectors; both memory layers and the agent binding.
- **CrewAI** as the implemented framework.

## 6. Reserved for a future format version

Specified in earlier revisions or designed since, and **not part of 1.0**. A 1.0 reader rejects all of it.

| Area | State |
|---|---|
| **Signing** — `sig`, the bundle signature, the key registry | Reserved. Bundles are unsigned in 1.0 |
| **Self-hosted models** — `type: model`, `model://` refs, inference descriptors | Reserved. 1.0 agents run on hosted models |
| **`mem://` store references** | Reserved. 1.0 memory ships inline |
| **Frameworks beyond the three** — `claude-sdk`, `vercel-ai`, `adk`, ACP | Reserved *names* in the registry; **rejected values** in 1.0 |
| **Adapter bindings** for memory providers and deployment targets (ADR-038) | Proposed |
| **Multi-agent `composition: bundle`** | Open |
| **`org` / `team` scope** | Reserved; no org concept in 1.0 |

Each of these adds keys or widens a closed set, so each requires a new format version — see below.

## 7. Versioning and compatibility

Three numbers, deliberately distinct:

| Number | Where it lives | Increments when |
|---|---|---|
| `vio: N` | In the artifact | A reader built against N−1 could misread a bundle |
| Specification revision | This document | The text changes — corrections, clarifications, errata |
| `manifest.version` | In the artifact, optional | The bundle's author chooses. Unrelated to the format |

**Additive change is not free.** Because every object is closed ([§1](#1-physical-format)), a bundle carrying a new
key is rejected by every reader built before that key existed. There is no ignored-unknown-field escape hatch and
no extension slot. **Adding a field therefore requires incrementing `vio`.**

This is a deliberate trade. Closed objects are what let a reader fail loudly instead of silently mis-deploying an
agent it only partly understands — a property worth more, in this domain, than cheap extensibility. But it must be
stated rather than discovered, and revisions 1–4 claimed the opposite.

**A consequence worth planning around:** a bundle cannot currently declare which specification revision produced
it. `vio: 1` is equally true of a revision-1 and a revision-5 bundle. Adding such a marker is itself an additive
change, so it would require `vio: 2`. Readers should feature-detect from the presence and shape of fields rather
than expecting a revision number.

**Rollout runs consumers-first.** Since a new key is rejected by an older reader, every consumer must accept a
field before any producer emits it — the reverse of the usual order.

---

## 8. Open questions

- Whether `requires[]` should pin a registry coordinate as well as `{ref, digest}`, so a bundle can require an
  artifact that lives only in a registry.
- Canonical-form edge cases for a future bundle signature — block-scalar trailing-newline rules in particular.
- Multi-agent crews (`composition: bundle`) — threading typed results between agents.
- Whether `vio: 2` should introduce a permissive extension point, and if so where. It cannot be placed on a
  digested body without hiding digest drift.

---

## Related

- [conformance.md](conformance.md) — the three conformance levels
- [reference.md](reference.md) — every field, location and reserved value
- [glossary.md](glossary.md) · [errata.md](errata.md)
- [`schema/v1/vio.schema.json`](../../schema/v1/vio.schema.json) — the structural schema, generated from the
  reference implementation
- [`spec/adr/`](../adr/) — the decision records this specification derives from
