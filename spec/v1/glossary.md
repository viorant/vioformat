# Glossary

| Term | Meaning |
|---|---|
| **VIO** | Verifiable Intelligence Object — the format's descriptive expansion. See the note on the extension's origin in [GOVERNANCE.md](../../GOVERNANCE.md#on-the-name). |
| artifact | One of the five typed units a bundle packages: prompt, skill, memory, model, agent. |
| authored artifact | An artifact with a `sig` — prompt, skill or agent. You sign what you author. |
| binding | The mapping from a variable to its source; the explicit statement of what stays dynamic. |
| bundle | A whole `.vio` document; also the `composition` value for multi-agent packages. |
| canonical form | The RFC 8785 serialization that digests and signatures are computed over. |
| capability surface | The tools, connectors and scopes a skill declares — inside its signature. |
| connector | Org-scoped, OAuth-bound infrastructure resolved on the control plane; never packaged. |
| connector rail | The path by which hosted models and MCP tools receive credentials at run. |
| deploy | An artifact's declared destination: `runtime`, `runtime/standalone`, `registry` or `store`. |
| digest-only | An artifact with a `digest` and no `sig` — memory and model. Integrity without authorship. |
| layer | A memory body's declaration of `seed` (curated) or `runtime` (agent-local scratch). |
| models rail | The path by which self-hosted weights are resolved, stood up and digest-checked on the target. |
| reserved value | Any value outside a field's enumerated set. Rejected by conforming readers. |
| template | What is signed: sections, variable schema and bindings — never the rendered string. |
| tree-shake | Producer step that ships only assets reachable from the composed agents. |
| two-facet output | An agent's `output.expected` (prose, prompt-shaping) and `output.schema` (typed, validating). |
| `vio_bundle` | The Sign asset type for a whole bundle; its signature is computed over the canonical manifest. |
