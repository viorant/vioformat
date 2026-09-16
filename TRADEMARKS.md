# Trademark and certification mark policy

**Status: DRAFT — pending review by counsel.** Registration status of the marks below is not yet asserted.

---

`.vio`, **VIO**, **the VIO Project** and **VIO Conformant** are trademarks of Viorant Inc.

**Trademarks are not licensed by the Apache-2.0 or CC-BY-4.0 grants**, and the patent covenant in
[PATENTS.md](PATENTS.md) does not license them either. Apache-2.0 says so explicitly in §6. This is deliberate and
it is the only thing the VIO Project controls: the specification is free to implement, the name is not free to
claim.

## What you may do without asking

- **Use the file extension `.vio`.** It is a file extension. Write, read and deploy `.vio` bundles freely.
- **Say what is true.** "Reads `.vio` bundles", "supports the `.vio` artifact format", "built on the `.vio`
  specification", "compatible with `.vio`" — all fine, in plain text, without a licence.
- **Reference the specification** by name, with attribution as required by CC-BY-4.0.
- **Name your project descriptively.** `vio-parser-rust`, `qdrant-vio-adapter`, `terraform-provider-vio` are fine.

## What needs permission

- **A product or company name in which VIO is the distinctive element** — "VIO Cloud", "VIOStack", "VIO Inc."
- **Use of the VIO Project logo or wordmark** as your own branding, or in a way that suggests your product is
  published, endorsed or maintained by the VIO Project.
- **Use of "VIO Conformant"** — see below.

## The "VIO Conformant" certification mark

**VIO Conformant** is a certification mark. Anyone may implement the specification; only an implementation that has
demonstrably passed the conformance suite may claim the mark.

| Requirement | |
|---|---|
| Pass the suite | Run [`conformance/v1/cases.yaml`](conformance/v1/cases.yaml) at the level you claim and publish the output |
| State the level | "VIO Conformant — Level 1 (Reader)", "Level 2 (Verifier)", "Level 3 (Deployer)". Never the bare mark |
| State the version | The format version and specification revision you conform to |
| Re-verify on revision | A claim lapses when the specification revision it was granted against is superseded by one that changes the cases you passed |

Registration is by pull request against the ecosystem listing. **The mark is granted on evidence, not on
commercial relationship** — passing the suite is the only requirement, and a competitor of Viorant Inc. that passes
is entitled to the mark on the same terms as anyone else.

Viorant Inc. may object to a claim of the mark by an implementation that does not pass, and to use of the mark
without a stated level and version. That is the whole of the enforcement, and it exists so that the mark means
something to the person reading it.

## Why the marks are held separately from the copyright

The specification, the schema and the reference tooling are licensed permissively precisely so that they can one
day be donated to a foundation without anyone's permission. The marks are held by Viorant Inc. so that such a
donation is a deliberate, separately negotiated act rather than an accident of licensing.

## Contact

Permission requests and questions: open an issue at <https://github.com/viorant/vioformat/issues>.
