---
name: Format proposal
about: Propose a change to the .vio artifact format
labels: proposal
---

## Problem

What a producer or consumer cannot do today.

## Alternatives considered

And why each was rejected.

## Proposed change

The change to the specification text. Cite the section.

## Compatibility statement

*Required for any change touching the reserved value sets, a digest subject, or the canonical form.*

- What do existing bundles do under this change?
- Is `layer`-style additive defaulting possible (omitted means the old behaviour)?
- Does the digest subject change? If so, which existing digests are invalidated?
- Do producers or consumers ship first?

## Conformance cases

Which fixtures in `examples/` and rows in `conformance/v1/cases.yaml` this adds or changes.
