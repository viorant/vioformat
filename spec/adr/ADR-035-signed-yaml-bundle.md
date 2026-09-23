# ADR-035 — `.vio` is a signed YAML artifact bundle, deployed by Helix

**Status:** Accepted · 2026-06-14 · **Supersedes:** the format clause of ADR-010
**Authors:** Adi Vora · **Co-author:** Vivien Roggero

## Context

`.vio` was defined as an OCI image with an `org.viorant.manifest.v1` annotation. That model made the artifact
opaque: the prompt, skills, memory and agent definition were payload inside layers, so nothing could read a bundle's
composition or capability surface without a container runtime, and nothing could sign an individual artifact
independently of the image.

## Decision

A `.vio` is a **single self-contained, signed YAML bundle**: `vio`, `manifest`, `artifacts`. Authored artifacts
carry their own signature; referenced and mutable artifacts are digest-pinned; one `vio_bundle` signature over the
canonical manifest binds them all. OCI is relocated to the deployer's pre-baked base images and to the reference
form for heavy skill trees — neither of which is the `.vio` itself.

## Consequences

- The "pull and run any `.vio` as a container" property is lost. Recorded as erratum `E-001`.
- Any YAML parser can read a bundle; the capability surface is inspectable before deploy without executing anything.
- Weights and multi-file trees need the embed-versus-reference rule (§1.1).
- Signing becomes representable at two granularities (§2.2) rather than one image signature.

## Alternatives considered

- **Keep OCI, add a sidecar manifest file.** Rejected: two artifacts to keep in sync, and the sidecar becomes the
  real format.
- **A zip or tar archive of files.** Rejected: `.vio` is a first-class format, not a renamed container, and an
  archive loses diffability.
- **JSON rather than YAML.** Rejected: every artifact body is multi-line text; block scalars keep it verbatim and
  reviewable instead of escaped one-liners.
