# The `.vio` Artifact Specification

**Status:** Accepted · **Format version:** 1 · **Revision:** 4 · **Date:** 2026-09-04
**Project:** the VIO Project · **Authors:** Vivien Roggero, Adi Vora
**Canonical:** <https://vioformat.org/spec>

The portable, signed deployment artifact for AI agents. A `.vio` is what gets handed from "the engineer composed
this agent" to "this agent is running somewhere."

> **History.** An earlier draft defined `.vio` as an OCI image carrying an `org.viorant.manifest.v1` annotation.
> That model is retired. A `.vio` is a single self-contained, signed YAML bundle; OCI images are relocated to the
> deployer's pre-baked base images, which are not the `.vio` itself. The "pull and run any `.vio` as a container"
> property no longer holds. See [errata.md](errata.md) `E-001`.

---

## What a `.vio` is

A `.vio` is a **single self-contained, signed bundle** of AI-infrastructure artifacts. It is the unit a conforming
deployer consumes. One file carries everything needed to verify provenance and deploy: a manifest, the artifact
bodies (or references to them), and the signatures that bind them.

Three concerns stack — none reinvents the others:

```
Sign      = how an artifact (or a whole bundle) is signed, verified, trust-scored   → dependency
.vio      = how signed artifacts are packaged together                              → this document
Deployer  = verifies the .vio via Sign, then deploys                                → deployer specification
```

**Signing is optional; its representation is not.** An unsigned bundle is a valid bundle and is what a local
compile-and-run produces. When a bundle is signed, the signing ceremony, key registry, verification engine, trust
scoring and enforcement gate are defined by **Viorant Sign** (<https://sign.viorant.ai>). This document only defines
how Sign's outputs are represented inside a `.vio`; it does not re-specify cryptography. Sign treats `vio_bundle` as
a first-class signable asset type with a defined `canonicalize_vio_bundle()` (RFC 8785 canonicalization); the format
below is built to match.

> This specification is written at its **target altitude** — all five artifact types, multiple frameworks, org and
> team scope — not narrowed to today's implemented subset. [§3](#3-implemented-subset) states exactly which parts
> the current reference implementation exercises.

---

## 1. Physical format

- **Encoding.** A single UTF-8 **YAML** document. Chosen over JSON because every artifact body is multi-line text —
  prompts, skills, memory, agent definitions — and YAML block scalars keep them verbatim and diff-able instead of
  base64 or escaped one-liners. Chosen over an archive because `.vio` is a first-class format, not a renamed
  container.
- **Top-level keys.** `vio` (format-version integer), `manifest` (authoritative metadata, signed as a unit),
  `artifacts` (the bodies).
- **Plain-YAML guarantee.** A `.vio` uses only the portable YAML core — UTF-8, block scalars for bodies, base64
  (ASCII) for signatures, plain scalars, maps and sequences. **No anchors or aliases, no custom `!tags`, no merge
  keys (`<<`), no binary framing.** Any YAML parser or formatter can open and lint a `.vio` with no format-specific
  tooling.
- **Formatting versus the signature.** Verification runs over the **canonical** form (`canonicalize_vio_bundle`,
  RFC 8785), not the on-disk bytes, so cosmetic reformatting — key order, flow versus block style, quoting,
  indentation — is **signature-safe**. The one exception: a formatter that rewrites a **block scalar** (`|` to `|-`,
  trailing newline, internal whitespace) changes that artifact's body string, therefore its `digest`, therefore its
  `sig`. That is tamper detection working as designed. Read and lint with any tool freely; only an authoring or save
  path must preserve block scalars exactly (use a canonical writer) or re-sign.

### 1.1 The embed-versus-reference rule

A single text document cannot hold model weights or multi-file code. So:

| Case | Representation |
|---|---|
| Text, small — prompt, declarative skill, single-file Python or JS skill, agent definition, memory body | **Embedded inline** as a YAML block scalar (`content: \|`) |
| Heavy or non-text — **models, always**; multi-file or dependency-bearing executable skills | **Referenced** by `ref` and pinned by `digest` (git ref, OCI image, `model://…`) |

The deployer resolves a `ref` on the target at deploy time; the manifest `digest` guarantees the resolved bytes are
the ones that were signed for.

### 1.2 Manifest field reference

| Field | Meaning |
|---|---|
| `id`, `name`, `version` | Package identity (semver) |
| `composition` | `agent` \| `prompt` \| `skill` \| `memory` \| `model` \| `bundle` |
| `framework` | For agents: `crewai` \| `langchain` \| `autogen` \| … (null otherwise) |
| `org`, `team` | Scope — drives trust, RBAC and registry namespace |
| `signer` | `{ certificate_id, algo_id }` — resolves in Sign's `public_keys` registry |
| `created` | ISO-8601 UTC |
| `artifacts[]` | Authoritative index — each: `id, type, kind?, runtime?, deploy, digest, sig?, ref?` |
| `requires[]` | Cross-artifact dependencies (agent → model `{id, digest}`, connector dependencies) |

### 1.3 Artifact index entry

Each row in `manifest.artifacts[]` is the authoritative descriptor for one artifact:

| Key | Meaning |
|---|---|
| `id` | Bundle-local id, referenced by siblings — e.g. an agent's `prompts: [{ref: sysprompt}]` |
| `type` | `prompt` \| `skill` \| `memory` \| `model` \| `agent` |
| `kind` | For `skill`: `declarative` \| `executable` (extensible per type) |
| `runtime` | For executable skill: `python` \| `js` |
| `deploy` | Destination and mode: `runtime` \| `runtime/standalone` \| `registry` \| `store` |
| `digest` | `sha256:…` of the content bytes — binds the artifact into the signed manifest |
| `sig` | Present only on **authored** artifacts ([§2](#2-how-signing-is-represented-in-a-vio)) — absent for digest-only references |
| `ref` | Present only for **referenced** artifacts (model, external skill) |

### 1.4 Worked example

See [`examples/valid/agt_research.vio`](../../examples/valid/agt_research.vio) — a CrewAI research agent bundling a
signed prompt, one declarative and one executable skill, a memory reference and a self-hosted model reference.

Three properties of this design:

1. **Self-describing.** The agent body references siblings by local `id`; the deployer wires them at deploy. No
   external lookup is needed to understand composition.
2. **Per-artifact `deploy`.** Routing is declared, not inferred — the deployer reads `deploy` and sends each
   artifact to Runtime, Registry or Store.
3. **Forward-compatible.** Unknown `type` / `framework` / `deploy` / `kind` values are **reserved** — a verifier
   that does not understand a value rejects cleanly rather than mis-deploying. The format grows without breaking
   older deployers.

### 1.5 Templated artifacts — sections, variables, binding

An authored artifact is a **template, not a finished string.** A prompt's `content` is a map of framework-neutral
**sections**; the `.vio` stays framework-neutral and a framework adapter assembles the native form at instantiate —
the same principle as `{{var}}`.

**Prompt artifact shape**

| Field | Meaning |
|---|---|
| `mode` | `chat` \| `single_shot` — tells the adapter whether to build a message array or one completion |
| `content.system` | System prompt (template with `{{vars}}`) |
| `content.user` | User prompt (template with `{{vars}}`) |
| `variables[]` | The dynamic-slot schema (below); spans all sections |
| `bindings` | Artifact-level defaults — the prompt is **self-runnable** from a registry |

> **Output is an agent field, two-faceted — not a prompt field.** A prompt is reusable across agents with different
> expected outputs, so the output contract lives on the agent. `output.expected` is prose; it shapes the prompt, so
> the adapter folds it into assembly like a section. `output.schema` is an optional typed (JSON-schema) contract the
> runtime uses to validate or coerce the result and to wire `source: task` between agents in a crew.

**Variable schema**

```yaml
variables:
  - { name: client, type: string, required: true,  source: input }
  - { name: today,  type: date,   required: false, source: env,    default: "now()" }
  - { name: tier,   type: enum,   values: [fast, deep], default: deep, source: static }
```

`source` ∈ `input | env | task | connector | secret | static`:

- `input` — supplied by the caller at each run (kept dynamic)
- `env` / `task` / `connector` — resolved by the system: deploy environment, upstream task output, tool result
- `secret` — a `secret://org/team/key` **reference**, resolved at run from a secret store; the value never enters
  the `.vio`
- `static` — baked at compose time (effectively fixed)

**Binding** — the explicit "what stays dynamic" — maps each variable to its source. Bindings sit at the **artifact
level** (so a lone prompt runs on its own) and an **agent may override** them when it composes the prompt. The
override is recorded in the *agent's* signed content, leaving the prompt's signature intact. The agent aggregates
unbound `input` variables into its `inputs` contract; a run that omits a required input fails validation before
execution.

**Why templates, not finished strings.** Values bind at runtime, outside the signature — so one signed template
serves every run without re-signing, and injected values are still bound to a verified template ([§2.4](#24-what-is-signed-for-a-templated-artifact)).

### 1.6 Skills and tools

**A skill is a file tree, not one file.** Skills are directories — `SKILL.md` plus `scripts/`, `references/` and
assets. The tree is represented as a `files` map keyed by relative path, plus an `entry` pointer; the manifest index
entry carries `entry` and the one `digest` over the canonicalized tree:

```yaml
# manifest index entry
- { id: research, type: skill, kind: executable, runtime: python,
    entry: scripts/run.py, deploy: runtime/standalone, digest: sha256:…, sig: base64… }

# artifacts body
- id: research
  type: skill
  entry: scripts/run.py
  files:
    SKILL.md:                  | …     # how and when to use
    scripts/run.py:            | …     # entrypoint
    scripts/helpers.py:        | …
    references/methodology.md: | …
  tools: [ … ]
```

- **The tree is the signed unit.** `digest` is `sha256` over the **canonicalized file map** (sorted paths, per-file
  NFC) — exactly Sign's `canonicalize_skill`. Renaming a path or editing any file breaks the signature; paths are
  part of the signed structure, not just contents.
- **Embed-versus-reference still applies.** Small text tree → inline `files`; heavy or binary tree (vendored
  dependencies, large assets) → `ref` plus digest (packed archive or OCI image), like models.
- **Single-file skills** keep the `content: |` shorthand (a one-file tree); `files` is the general form. The same
  `entry`/`files` model applies to declarative skills (just `SKILL.md`).

A skill also declares the **tools** it uses. Tools come in two kinds:

| `kind` | Source | Auth |
|---|---|---|
| `viorant` | Native capability provided by the runtime or base image | None, or platform-internal |
| `mcp` | A tool exposed by an **MCP connector** (Gmail, Slack, SerpAPI, …) | **OAuth**, resolved per deployment on the control plane |

**Tool declaration** on the skill artifact pins the exact tool and, for MCP, the connector and scopes — least
privilege:

```yaml
tools:
  - { ref: http_get,   kind: viorant }
  - { ref: serp_query, kind: mcp, connector: serpapi, scopes: [search.read] }
```

**Connectors are control-plane references, never packaged in the `.vio`.** A connector is org- or team-specific,
OAuth-bound infrastructure — not a portable, signable artifact. The bundle surfaces its connector dependencies at
the manifest level so a deployer can gate and resolve auth without parsing every skill body:

```yaml
manifest:
  requires:
    - { connector: serpapi, scopes: [search.read], auth: oauth }
```

**Capability is signed; credentials are not.** The skill's signed content includes its `tools` declaration
(connector and scopes), so a signed skill has a **tamper-proof, auditable capability surface** — you cannot add a
tool or widen a scope without breaking the signature. OAuth tokens **never enter the `.vio`**: they live in the
control-plane connector store and are injected to the runtime at run via a `connection://org/team/connector` handle
(the same shape as the `secret://` variable source; `source: connector` covers tool-result values).

> **Why OAuth "again".** Tokens are per-org, short-lived and non-portable. Deploying a signed skill to a new org,
> team or cloud means that deployment's control plane must hold a valid connection for each required connector — so
> OAuth is (re-)done there if absent. Capability travels in the file; permission-to-act-here is resolved per
> deployment.

### 1.7 Models and inference

The model type covers **local, self-hosted** models only. A model artifact is a **reference plus an inference
descriptor — never weights.** The `.vio` carries a `model://…` ref (digest-pinned) plus the descriptor a deployer
needs to stand it up, on the **manifest index entry** so it is covered directly by the bundle signature; the model
itself stays body-less.

| Field (manifest entry) | Meaning |
|---|---|
| `ref` | `model://org/name` — the weights, resolved on the target at deploy |
| `digest` | `sha256` of the resolved weights (integrity, no authorship) |
| `engine` | Inference runtime: `vllm` \| `llama.cpp` \| `ollama` \| … — selects the inference base image flavor |
| `quantization` | e.g. `q4_k_m` (optional) |
| `context_length` | Served context window (optional) |
| `served_as` | The name the agent or framework calls (optional; defaults to `name`) |

```yaml
- { id: llama, type: model, deploy: runtime, ref: "model://viorant/llama3-8b",
    engine: vllm, quantization: q4_k_m, context_length: 8192, served_as: llama3-8b,
    digest: "sha256:7c33…" }   # no sig — integrity-only tier
```

- **Integrity-only, descriptor included.** A model carries no `sig` — you cannot author-sign someone's weights — but
  the descriptor sits in the signed manifest and the `digest` covers the resolved weights. Both *how it is stood up*
  and *what bytes run* are tamper-evident ([§2.3](#23-why-digest-only-is-still-tamper-evident)).
- **Hosted models are connectors, not model artifacts.** A hosted LLM is **not** a `type: model`. `type: model`
  means self-hosted weights you *deploy*; a hosted model is an API credential you *resolve*, so it rides the
  **connector rail** — a control-plane connection, key injected at run via `connection://`, exactly like SerpAPI.
  The two trust and deploy profiles (deploy a container versus resolve a credential) stay cleanly separated.

**Decode parameters are agent-level — not model- or prompt-level.** *How to stand the model up* is the model's
concern; *how to sample it* is how the **agent** uses it. Decode params (`temperature`, `max_tokens`, `top_p`,
`stop`, …) layer like bindings:

```yaml
# agent body
model:
  ref: llama
  params: { temperature: 0.2, max_tokens: 1500 }   # agent override
```

Precedence is **run > agent > model-default**: a model may publish recommended `params` on its manifest entry, the
agent overrides, and a run may override per invocation. Params are **config, not secrets** — they live in the file
as part of the agent's signed content. A prompt stays sampling-neutral, so params are never prompt-level.

### 1.8 Memory bodies and the `layer` field

A memory artifact ships its `.memory.md` text inline as a body. A workspace holds **two structurally identical kinds
of memory** — a **curated seed** the user authored, and an agent's **local runtime scratch** written by a `remember`
tool — so the body declares which it is:

| Field (artifact body) | Meaning |
|---|---|
| `layer` | `seed` \| `runtime` — which memory layer this body is. **Optional; defaults to `seed`.** |

```yaml
artifacts:
  - id: 01M1NC0WFNSS0WWN1690VY2FR8
    type: memory
    layer: seed                       # curated — ships with its body text intact
    content: |
      ---
      meta: {id: 01M1NC0WFNSS0WWN1690VY2FR8, schemaVersion: "1"}
      name: Memory 1
      description: Persistent memory for agent runs.
      ---
      Viorant is an AI infrastructure company…
  - id: 01KYRN79YYQ841RD37EKSMGKK9
    type: memory
    layer: runtime                    # agent-local scratch — frontmatter only, body empty
    content: |
      ---
      meta: {id: 01KYRN79YYQ841RD37EKSMGKK9, schemaVersion: "1"}
      name: confluence-updates
      description: Persistent memory for agent runs.
      ---
```

- **Omitted means `seed`.** A pre-`layer` bundle parses unchanged and is read as curated content — which is what
  those bundles actually carried. This is the safe default direction.
- **It lives on the body, not the manifest index entry.** The body is where the deployer and runner read from;
  widening the index too would double the compatibility surface for no consumer.
- **It is not part of the digest subject.** A memory artifact digests `{ content }` only, so adding or changing
  `layer` leaves every existing `manifest.artifacts[].digest` valid — no forced re-export, no `digest_mismatch` on
  already-deployed bundles.
- **Materialization is layer-driven.** A deployer writes `seed` → `{id}.memory.md` at the memory root and `runtime`
  → `.runtime/{id}.memory.md`, so the instance classifies each memory correctly on its first run rather than only
  after its first write.
- **A `runtime` body ships frontmatter-only, but it still ships.** The producer emits the parsed frontmatter with an
  empty body: the agent's accumulated local history stays local, while the ULID binding survives. Omitting the
  artifact entirely is not an equivalent optimization — an absent write target fails the first run with a dangling
  reference.
- **A redeploy never clobbers accumulated runtime state.** The deploy target checks for an existing runtime object
  *before* writing and skips it, emitting a preservation notice instead. Ordering is load-bearing: a check performed
  after the write reports a preservation that did not happen.
- **Compatibility runs consumers-first.** The memory body schema is strict and the runtime parses the whole bundle
  at boot, so a bundle carrying `layer` is rejected by a runtime built against a pre-`layer` schema. Producers must
  ship *after* consumers — the reverse of the usual order.

> **Why the layer is declared rather than derived.** An earlier design keyed this off the agent's `memory.read` /
> `memory.write` binding. That is the wrong axis: **layer** is a property of the *asset* (curated versus scratch),
> while **binding** is a property of the agent's *reference* to it — and a seed-layer memory can legitimately be
> write-bound, in which case the runtime promotes a copy into the runtime layer on first write rather than mutating
> the seed. Deriving layer from binding would blank a curated, user-authored memory the moment an agent wrote to it.
> `.vio` is a published portable format; an artifact should say what it is, rather than leaving the semantic
> implicit in a cross-reference every third-party consumer has to know to perform.

---

## 2. How signing is represented in a `.vio`

The full cryptography belongs to Sign; this section defines only what appears in the file.

### 2.1 Two-tier trust

> You **sign what you author**; you **digest-pin what you reference or what is mutable.**

| Artifact | Trust tier | In the file |
|---|---|---|
| **prompt** | Signed | `sig` present; is a Sign `prompt` asset |
| **skill** | Signed | `sig` present; Sign `skill` asset (declarative *and* executable) |
| **agent** | Signed | `sig` present; the bundle is a Sign `vio_bundle` |
| **memory** | Integrity only | `digest` only, no `sig` — mutable user data; carries an inline body plus its `layer` |
| **model** | Integrity only | `digest` and `ref` only, no `sig` — a reference to self-hosted weights you cannot author-sign |

### 2.2 Two signing domains

- **Per-artifact (`sig`).** Each authored artifact is itself a Sign asset with its own signature, so it stays
  independently verifiable even when pulled out of this bundle — a signed prompt reused from a registry, for
  example. Algorithms per Sign `algo_id`: default `0x02` = RSA-2048 + ECDSA-P256; `0x04` = Ed25519; `0x03` = with
  Dilithium (post-quantum). The authoring tool runs the Sign ceremony when the artifact is authored.
- **Bundle (`vio_bundle` signature).** The whole `.vio` is signed as one Sign `vio_bundle` asset over the
  **canonical-YAML** form of the manifest (`canonicalize_vio_bundle()`, RFC 8785). Because `manifest.artifacts[]`
  lists **every** artifact's `digest`, this single signature transitively binds **all** content — including the
  digest-only memory and model.

### 2.3 Why digest-only is still tamper-evident

A model cannot be author-signed, but its `digest` sits inside the manifest that *is* signed as a `vio_bundle`.
Tampering with the model on the target changes its hash; the manifest digest no longer matches; bundle verification
fails. Reference-only artifacts therefore get **integrity without authorship**: provenance is not claimed, but
tampering is caught. The model's inference descriptor lives in the manifest index entry, so it is covered
**directly** by the bundle signature; the weights `digest` additionally catches tampering with the resolved weights
on the target.

### 2.4 What is signed for a templated artifact

The signed or digested content of a prompt or skill is the **whole authored structure.** For a prompt: `mode`, the
`system`/`user` sections, the `variables` schema and default `bindings`. For a skill: its code or text **plus its
`tools` declaration** (connector and scopes) — canonically serialized (RFC 8785), **never the bound values or OAuth
tokens.** Consequences:

- Tampering with a section, adding a stray `{{slot}}`, changing a variable's `type`, redirecting a `binding` (e.g.
  to a different `secret://…`), **adding a tool or widening a connector scope** → **breaks the signature.**
- Filling `{{client}} = "Acme"`, or injecting an OAuth token or tool result at runtime → does **not** touch the
  signature (values and credentials live outside the signed content).

So **verification happens on the template; interpolation and framework assembly happen after verification**, at
instantiate or run. This is exactly why a finished string would be wrong — it would force re-signing per run, or
leave injected values bound to an unverified blob.

---

## 3. Implemented subset

The specification above is the **full target.** The current reference implementation exercises a deliberate
**subset** of it. This section is the line between "the standard" and "what is built".

**Implemented — the local compile-and-run path**

- A **workspace** (a folder of authored assets) **compiles to a `.vio`**: *tree-shake* (only assets reachable from
  the composed agents ship) → *inline-resolve* (resolve id-bound refs via the per-workspace discovery scan) →
  serialize to the YAML bundle above.
- **Run is compile-then-run, always, through `.vio`.** A local run compiles the workspace to an unsigned, in-memory
  `.vio` and hands it to the local runner. This removes dev/prod drift — what you run locally is the same artifact
  shape you later deploy.
- **CrewAI only** (`framework: crewai`); single-agent or within-crew composition.
- Format features exercised: the manifest and artifact index; embedded prompt, skill and agent bodies; the
  templated-artifact model; id-based refs; memory bodies with `layer`; the models rail and the connector rail.

**Specified, not yet built**

- **Signing** — the `sig` / `vio_bundle` signature representation ([§2](#2-how-signing-is-represented-in-a-vio)).
  The current compile produces an **unsigned** bundle.
- **Off-machine deploy** — the deploy gates and the three destinations.
- **Multi-framework** — LangChain, AutoGen, ACP, Claude SDK, Vercel AI SDK and Google ADK adapters are future; the
  format is already neutral, only the CrewAI adapter is built.

---

## 4. Scope notes

- **Memory ships an inline body.** The format reserves `type: memory` and the `store` destination; a memory artifact
  carries its `.memory.md` text inline plus a `layer` ([§1.8](#18-memory-bodies-and-the-layer-field)).
- **Model = reference, never payload.** Weights are never embedded. Hosted models are not `type: model` — they ride
  the connector rail ([§1.7](#17-models-and-inference)).
- **Reserved compositions.** `prompt`, `skill`, `memory`, `model` and `bundle` are valid compositions, but a
  standalone non-runnable artifact (a lone prompt, say) deploys to a **registry**, not a runtime.

## 5. Open questions

- Canonical-YAML edge cases for `vio_bundle` signing (block-scalar trailing-newline rules) — inherit Sign's
  canonicalizer exactly; pin a round-trip test.
- Whether `requires[]` should also pin a registry coordinate (not just `{ref, digest}`) so a bundle can require an
  artifact that lives only in a registry, not inline. Leaning yes, post-v1.
- **Adapter bindings** — memory providers and deployment targets have no declaration surface today, so that
  configuration lives outside the bundle and therefore outside the signature. Addressed by
  [ADR-038](../adr/ADR-038-adapter-declaration-surface.md); draft text in
  [`spec/proposals/019-adapter-bindings.md`](../proposals/019-adapter-bindings.md).
- **Multi-agent crews** (`composition: bundle`) — threading typed `source: task` results between agents; the run
  contract already covers it, the bundle composition surface is the open thread.

---

## Related

- [conformance.md](conformance.md) — the three conformance levels
- [reference.md](reference.md) — every field, location and reserved value
- [glossary.md](glossary.md)
- [errata.md](errata.md)
- [`spec/adr/`](../adr/) — the decision records this specification derives from
