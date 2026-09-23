# Errata

| Ref | Affects | Correction |
|---|---|---|
| `E-001` | Any material describing a `.vio` as an OCI image, or claiming `docker pull` / `docker run` of a `.vio` | Retired by ADR-035. A `.vio` is a YAML bundle. OCI images are the reference form for heavy skill trees and the deployer's base images only. |
| `E-002` | Statements that memory is body-less or reference-only | Superseded. Memory artifacts carry an inline `.memory.md` body and a `layer` (rev. 4). The `store` destination and `mem://` references remain valid. |
| `E-003` | Any reading of memory `layer` as derived from an agent's read/write binding | Layer is declared on the asset, never derived from the binding. A write-bound seed memory is promoted to a runtime copy on first write; the seed is not mutated. |
