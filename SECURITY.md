# Security policy

## Reporting

Report a vulnerability in the specification, the reference linter or the website privately through GitHub's
security advisory flow on this repository. Do not open a public issue for an unfixed vulnerability.

## What counts as a specification vulnerability

A defect in the format itself that allows one of these to hold for a bundle a conforming implementation accepts:

- A change to an artifact's meaning that does not break its `digest` or `sig`.
- A capability — tool, connector or scope — reaching a runtime without appearing in a signed skill's `tools`
  declaration and in `manifest.requires[]`.
- A credential, key or token being carried inside a bundle rather than referenced through `secret://` or
  `connection://`.
- A digest-only artifact (memory, model) being substituted on the target without bundle verification failing.
- A reserved or unknown enumerated value being silently accepted rather than rejected.

## Out of scope here

Cryptographic primitives, key management, the signing ceremony and the trust model belong to Viorant Sign
(<https://sign.viorant.ai>) and should be reported there.
