# Proposed §1.9 — Adapter bindings

**Status:** Proposal for revision 5 · derives from [ADR-038](../adr/ADR-038-adapter-declaration-surface.md)

> Draft specification text. Not yet normative.

---

A `.vio` is declarative: it names **which** framework, memory provider or deployment target it expects. A deployer
loads an **adapter** that knows how to satisfy that name. Adapters are implementations and live in the deployer;
the format defines only how a bundle declares its expectation.

## 1.9.1 The adapter binding

An adapter binding is a map with an adapter `id` and an optional `config`:

```yaml
{ adapter: <id>, config: { … } }
```

Three places carry one:

| Location | Declares | Level |
|---|---|---|
| `manifest.framework` | The framework an agent's adapter assembles for | bundle |
| `<memory>.provider` | The store backing a memory artifact | artifact |
| `manifest.targets[]` | Deployment targets, each with a bundle-local `id` | bundle |

```yaml
manifest:
  framework: crewai
  targets:
    - { id: prod, adapter: aws, config: { region: eu-west-1 } }
    - { id: dev,  adapter: local }
  requires:
    - { adapter: qdrant, kind: memory }

artifacts:
  - id: mem
    type: memory
    layer: seed
    provider: { adapter: qdrant, config: { collection: research, dims: 1536 } }
    content: | …
```

`manifest.framework` remains a bare string for compatibility; it **is** an adapter binding of kind `framework` with
no config, and a conforming reader treats it as one.

## 1.9.2 `config` is configuration, never credentials

Endpoints, regions, collection names, dimensions and index parameters belong in `config`. Keys, tokens and
passwords do not: they ride `secret://org/team/key` and `connection://org/team/connector` exactly as elsewhere
(§1.5, §1.6). A bundle carrying a literal credential in `config` is non-conforming regardless of its signatures.

`config` is part of the artifact's or manifest's **signed content**. Changing which store backs a memory, or which
region an agent deploys to, breaks the signature — which is the point.

## 1.9.3 Adapter ids are an open, registered set

**This is the format's one deliberate exception to the reserved-value rule** (§1.4, property 3). Everywhere else, a
value outside its enumerated set is reserved and a conforming reader rejects it. Adapter ids invert that:

- A **reader** MUST accept an adapter id it does not recognise, and MUST NOT validate `config` contents. An id is a
  name, not a semantic.
- A **deployer** that has no adapter for a declared id MUST fail the deploy explicitly with `adapter_unavailable`,
  naming the id and the kind. It MUST NOT substitute a different adapter, and MUST NOT silently omit the binding.
- A **deployer** validates `config` through the loaded adapter's own schema before deploying, and fails with
  `adapter_config_invalid` if it does not satisfy it.

> **Why this set is open.** Adapter kinds span frameworks, memory providers, deployment targets and more; the
> cross-product is unbounded and grows without the editors' involvement. A closed enum would require a
> specification revision per provider and would gate the format's extension point on one implementation's release
> train. The reserved-value rule exists so that a deployer never *mis-deploys*; an unrecognised adapter id cannot
> cause a mis-deploy, because the deployer's only conforming response is to stop.

Ids are registered in [`registry/adapters.yaml`](../../registry/adapters.yaml). Registration reserves a name and
records its kind and maintainer; it is not a claim that any deployer supports it.

## 1.9.4 Surfacing, for gating

Adapter requirements are surfaced at the manifest level so a deployer can gate before parsing bodies — the same
reasoning as connector requirements (§1.6):

```yaml
manifest:
  requires:
    - { adapter: qdrant, kind: memory }
    - { connector: serpapi, scopes: [search.read], auth: oauth }
```

A deployer checks every required adapter is loadable, and every required connector has a live connection, **before**
deploying anything.

## 1.9.5 Adapters run after verification

An adapter is loaded and invoked only after the bundle verifies. An adapter MUST NOT widen the capability surface:
it cannot add a tool, a connector or a scope beyond what the signed artifacts declare. An adapter that needs a
capability the bundle does not declare is a bundle that needs re-authoring, not an adapter that grants itself one.

## 1.9.6 Compatibility

`provider` and `targets` are optional; a bundle omitting them behaves exactly as in revision 4. `provider` sits on
the memory body and, like `layer` (§1.8), is **outside the memory digest subject** — a memory artifact digests
`{ content }` only — so existing `manifest.artifacts[].digest` values stay valid and no re-export is forced.

`manifest.targets[]` is inside the manifest and therefore inside the `vio_bundle` signature subject. Adding it to an
existing bundle requires re-signing, as any manifest change does.

Rollout is **consumers-first**: a strict runtime built against the revision-4 schema rejects a bundle carrying
`provider` or `targets`. Producers ship after consumers.
