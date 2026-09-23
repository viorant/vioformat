# Errata

| Ref | Affects | Correction |
|---|---|---|
| `E-001` | Any material describing a `.vio` as an OCI image, or claiming `docker pull` / `docker run` of a `.vio` | Retired by ADR-035. A `.vio` is a YAML bundle. OCI images are the reference form for heavy skill trees and the deployer's base images only. |
| `E-002` | Statements that memory is body-less or reference-only | Superseded. Memory artifacts carry an inline `.memory.md` body and a `layer` (rev. 4). The `store` destination and `mem://` references remain valid. |
| `E-003` | Any reading of memory `layer` as derived from an agent's read/write binding | Layer is declared on the asset, never derived from the binding. A write-bound seed memory is promoted to a runtime copy on first write; the seed is not mutated. |
| `E-004` | Revisions 1–4 as a whole, and any material describing `.vio` at "target altitude" with an implemented-subset carve-out | Superseded by revision 5. The specification describes the locked VIO 1.0 format and nothing else; designed-but-unbuilt surface is listed in §6 as reserved. The earlier framing produced a document that disagreed with every bundle the reference implementation emits. |
| `E-005` | §1.4 property 3, "The format grows without breaking older deployers" (revisions 1–4) | **False; removed in revision 5.** It holds for unknown *values* in a closed set, which reject cleanly. It does not hold for unknown *keys*, which also reject — so a bundle carrying a new field is rejected by every reader built before that field existed. Additive change requires a new format version. See §7. |
| `E-006` | Any material stating that `manifest.version` or `manifest.signer` is required | Both are optional, and the reference producer emits neither. Revisions 1–4 marked them required, which caused conforming bundles to be rejected. |
| `E-007` | Any material describing adapter ids as an open value set a reader accepts unrecognised, as applied to `manifest.framework` | Registering an adapter id reserves the *name*. In 1.0 `framework` is a closed set of `crewai`, `langchain`, `autogen`; every other value is rejected, including registry-reserved ids. Widening it requires a new format version. |
| `E-008` | Level 2 conformance text requiring per-file **NFC normalization** for skill-tree digests | No Unicode normalization is applied at any point. File contents are digested byte-verbatim; RFC 8785 governs, and it does not normalize. |

