# vio-lint

Reference **Level 1 (Reader)** linter for the `.vio` artifact format. It implements every check a conforming reader
owes — and nothing beyond it.

```bash
npm install
node index.js ../../examples/valid/agt_research.vio
node index.js --json ../../examples/invalid/scope-beyond-requires.vio
npm test        # runs the conformance suite in conformance/v1/cases.yaml
```

## What it checks

| Rule | Section |
|---|---|
| `plain_yaml` | §1 — no anchors, aliases, custom tags or merge keys |
| `parse` | §1 — parses with a stock YAML 1.2 core-schema parser |
| `unsupported_version` | §1 — `vio` is an integer this reader implements |
| `top_level` | §1 — only `vio`, `manifest`, `artifacts` |
| `manifest_required` | §1.2 — required manifest fields present |
| `reserved_value` | §1.2, §1.3, §1.5, §1.6, §1.8 — every enumerated field |
| `digest_shape` | §1.3 — `sha256:…` |
| `trust_tier` | §2.1 — memory and model never carry a `sig` |
| `model_body` | §1.7 — a model is a ref, never a body |
| `orphan_body` | §1.3 — every body has a manifest index entry |
| `undeclared_variable` | §2.4 — no `{{slot}}` outside `variables[]` |
| `scope_widening` | §1.6 — no skill scope beyond `manifest.requires[]` |
| `credential_literal` | conformance invariants — no credential-shaped literal |
| `missing_signature` *(warning)* | §3 — signing is optional; an unsigned bundle is valid |

## What it does not check

Signatures and digests. Verifying a `sig` or recomputing a `digest` over the canonical form is **Level 2**, requires
a key registry, and belongs to Viorant Sign (<https://sign.viorant.ai>). This linter never reports a bundle as
verified.

## Exit codes

`0` accepted (warnings allowed) · `1` rejected · `2` could not read the file.
