# ADR-038 — Adapter declaration surface and the open adapter id set

**Status:** DRAFT — in review · **Authors:** Vivien Roggero, Adi Vora · **Reviewer:** Adi Vora
**Confluence:** https://viorant.atlassian.net/wiki/spaces/Viorant/pages/79757314/ADR-038+Adapter+declaration+surface+and+the+open+adapter+id+set
**Affects:** specification §1.7, §1.8, a new §1.9 · **Target:** revision 5

## Context

A `.vio` is **declarative**; adapters are **implementations**. The bundle names which framework, memory provider or
deployment target it expects; a deployer loads an adapter that knows how to satisfy that name. Adapters live in the
deployer (Helix), not in the format.

Adapters span at least four dimensions:

| Dimension | Examples |
|---|---|
| Framework | CrewAI, LangChain, AutoGen, ACP, Claude Agent SDK, Vercel AI SDK, Google ADK |
| Memory provider | Qdrant, Weaviate, Pinecone, pgvector, Chroma, filesystem |
| Deployment target | AWS, GCP, Azure, Fly, on-prem, local |
| Further kinds | observability sinks, secret stores, registries |

The cross-product is unbounded and grows without the editors' involvement. **No single vendor can implement every
adapter, and a format whose extension points are gated by one vendor's product roadmap is not a portable format.**

Two concrete gaps today:

1. **Memory providers cannot be declared.** A memory artifact carries `layer`, `content` and a `mem://` ref. Nothing
   says the memory is backed by a particular vector store with particular parameters.
2. **Deployment targets cannot be declared.** `deploy` names a destination *class* (`runtime`, `registry`, `store`),
   never a *target*.

Both are configured somewhere today. Wherever that is, **it is outside the bundle — and therefore outside the
signature.** "Where does this agent's memory actually go" is exactly the question an audit asks, and the current
format cannot answer it tamper-evidently.

## Decision

### 1. Declare adapter bindings inside the bundle

A new §1.9 defines an **adapter binding**: `{ adapter: <id>, config: { … } }`.

```yaml
# memory artifact — which provider backs this memory
- id: mem
  type: memory
  layer: seed
  provider: { adapter: qdrant, config: { collection: research, dims: 1536 } }
  content: | …

# manifest — deployment targets, alongside connector requirements
manifest:
  targets:
    - { id: prod, adapter: aws, config: { region: eu-west-1 } }
    - { id: dev,  adapter: local }
  requires:
    - { adapter: qdrant, kind: memory }      # surfaced for gating, like connectors
```

Framework binding stays where it is (`manifest.framework`); it is an adapter id by another name and revision 5
states that explicitly rather than renaming a field in wide use.

`config` is **configuration, never credentials.** Endpoints, regions, collection names and dimensions live here;
keys and tokens ride `secret://` and `connection://` exactly as today.

### 2. Adapter ids are an open, registered set

This is a deliberate exception to the reserved-value rule (§1.4, property 3).

- A **reader** MUST accept an adapter id it does not recognise. An id is a name, not a semantic; rejecting unknown
  ids would make the format's extension point closed.
- A **deployer** that has no adapter for a declared id MUST fail the deploy explicitly with `adapter_unavailable`,
  naming the id and kind. It MUST NOT substitute a different adapter or silently omit the binding.
- `config` is validated by the adapter's own schema, not by the format. A reader does not validate `config`
  contents; a deployer validates it through the loaded adapter before deploying.

Everything else in the format keeps the closed-set rule. §1.9 states the exception and the reasoning so a future
editor does not "fix" the inconsistency.

### 3. Ids are registered publicly, registration is not gated by any implementation

[`registry/adapters.yaml`](../../registry/adapters.yaml) in this repository is the id registry. Anyone may register
an id by pull request. Registration reserves a name and records the kind, the maintainer and the SDK version — it
is **not** a statement that any particular deployer supports it.

### 4. The adapter interface is published under an open licence

The adapter SDK — interface, config-schema contract, lifecycle hooks and an adapter conformance harness — is
published Apache-2.0 in a separate repository so that a framework, database or cloud vendor can write and ship an
adapter without the editors' involvement, and without access to any proprietary deployer source.

## Consequences

- **Provider and target configuration enters the signed bundle.** Changing which vector store backs a memory, or
  which region an agent deploys to, becomes tamper-evident. This is the main reason to do this at all.
- **One open set in a closed-set format.** Accepted cost. §1.9 documents it.
- **A new deployer failure mode**, `adapter_unavailable`, distinct from a reserved-value rejection: the bundle is
  valid, this deployer cannot satisfy it. Conformance level 3 gains a case.
- **Additive and optional.** `provider` and `targets` are optional; a bundle omitting them behaves exactly as
  today. No digest subject changes: `provider` sits on the memory body but, like `layer`, is **outside** the memory
  digest subject (`{ content }` only), so existing digests stay valid.
- **Rollout is consumers-first**, as with `layer`: strict schemas mean a bundle carrying `provider` or `targets` is
  rejected by a runtime built against the revision-4 schema. Producers ship after consumers.
- **The neutrality claim becomes true rather than aspirational.** "Framework-neutral" with one vendor-controlled
  adapter set is a claim about intent; with a published SDK and an open registry it is a property of the system.

## Alternatives considered

- **A closed enum of adapter ids.** Rejected: every new provider would require a specification revision, and the
  format's extension point would be gated by one vendor's release train.
- **Keep provider and target configuration outside the bundle.** Rejected: it is then outside the signature, and the
  bundle stops being self-describing — the two properties the format exists to provide.
- **Put adapter bindings only in the manifest, not on artifacts.** Rejected for memory: the provider is a property
  of that memory, and a bundle may hold several memories with different backings. Targets are genuinely
  bundle-level, so they sit on the manifest.
- **Ship adapters in the format repository.** Rejected: adapters are implementations, and binding the format's
  release cadence to an unbounded implementation matrix is the failure this ADR exists to avoid.

## Open for review

Three points where the reviewer's call decides the shape:

1. **Body vs index entry for `provider`.** Drafted on the memory body, mirroring `layer`, so existing digests stay
   valid. The alternative is the manifest index entry, which is covered directly by the bundle signature but
   changes the digest subject.
2. **Is `targets` the right level?** Drafted as bundle-level with per-target ids. Alternative: a single target,
   resolved at deploy by the CLI rather than declared.
3. **Which first-party adapters stay proprietary.** The SDK being open does not decide this; it only decides that
   third parties *can* write their own.
