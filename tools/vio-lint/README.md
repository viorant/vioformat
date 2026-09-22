# vio-lint

Reference **Level 1 (Reader)** linter for the `.vio` artifact format. It implements every check a conforming reader
owes — and nothing beyond it.

```bash
npm install
node index.js ../../examples/valid/minimal_prompt.vio
node index.js --json ../../examples/invalid/scope-beyond-requires.vio
npm test            # conformance suite + parity with the reference implementation
npm run conformance # conformance/v1/cases.yaml alone
npm run parity      # digest and accept/reject parity; skips if the reference impl is absent
```

## How it is built

Two layers, deliberately separated.

**Structure** is delegated to [`schema/v1/vio.schema.json`](../../schema/v1/vio.schema.json), which is *generated*
from the reference implementation's bundle schema. This linter does not restate the field list. It used to, and it
drifted: it required `manifest.version` and `manifest.signer`, neither of which the format requires, so it rejected
every bundle the reference implementation produces — while its own suite stayed green, because the two sides never
ran each other's inputs.

**Cross-cutting rules** are the linter's own work. They are the checks JSON Schema cannot express, and they are
where the format's guarantees actually live.

## What it checks

| Rule | Section |
|---|---|
| `plain_yaml` | §1 — no anchors, aliases, custom tags or merge keys |
| `parser_dependent` | §1 — no value whose scalar resolution differs between YAML cores |
| `parse` | §1 — parses with a stock YAML 1.2 core-schema parser |
| `unsupported_version` | §1 — `vio` is an integer this reader implements |
| `schema` | §1.2 — structure, per the generated schema; every object is closed |
| `reserved_value` | any enumerated field — a value outside the set is reserved |
| **`digest_mismatch`** | §2.3 — every body is re-digested and compared to its index entry |
| `digest_subject` | §2.3 — the body projects to a digestable subject |
| `trust_tier` | §2.1 — memory and model never carry a `sig` |
| `model_body` | §1.7 — a model is a ref, never a body |
| `orphan_body` | §1.3 — every body has a manifest index entry |
| `missing_body` | §1.3 — every index entry has a body or a ref |
| `undeclared_variable` | §2.4 — no `{{slot}}` outside `variables[]` |
| `scope_widening` | §1.6 — no skill scope or tool beyond `manifest.requires[]` |
| `credential_literal` | conformance invariants — no credential-shaped literal |
| `missing_signature` *(warning)* | §3 — signing is optional; an unsigned bundle is valid |

### Digests are verified

This is new, and it is the point. Signing is out of phase, so `manifest.artifacts[].digest` is the *entire*
integrity story — the only thing that catches a body edited after the bundle was produced. A conformance suite that
never recomputes one cannot test the property the format exists to provide.

`digest.js` is a faithful port of the reference implementation's rule:

```
digest = "sha256:" + sha256(utf8(JCS(subject(body))))
```

where `subject` is the body minus `id` and `type`, projected per artifact type. `test/parity.js` recomputes every
fixture's digests through both implementations and fails on any divergence, so the port cannot quietly become a
second, wrong definition of the format.

## What it does not check

**Signatures.** Verifying a `sig` or the `vio_bundle` signature is **Level 2**, requires a key registry, and belongs
to Viorant Sign (<https://sign.viorant.ai>). This linter never reports a bundle as verified.

## Dependencies

`js-yaml` for parsing and `ajv` for the generated schema. The digest implementation — RFC 8785 canonicalization and
SHA-256 — is dependency-free by construction, matching the reference implementation it is ported from.

## Exit codes

`0` accepted (warnings allowed) · `1` rejected · `2` could not read the file.
