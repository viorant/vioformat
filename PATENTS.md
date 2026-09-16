# Patent non-assertion covenant

**Status: DRAFT — pending review by counsel.** This document states the VIO Project's intent. It is not effective
until reviewed, dated and published by Viorant Inc. Do not rely on it until this notice is removed.

---

## Summary, in plain language

Viorant Inc. has patent applications pending on the `.vio` artifact format. **If you implement the specification
conformantly, we will not assert those patents against you, and you owe us nothing for that.** If you sue us or
another implementer over patents covering the format, this promise stops applying to you.

This covenant covers the **format** only. It does not cover the Viorant Helix deployment engine or the Viorant Sign
substrate, which are separate patents and separate products.

---

## 1. Definitions

**"Specification"** — The `.vio` Artifact Specification published by the VIO Project at
<https://vioformat.org/spec>, in any revision, together with the conformance levels defined in
[`spec/v1/conformance.md`](spec/v1/conformance.md).

**"Format Patents"** — Patents and patent applications owned or controlled by Viorant Inc., now or in future, whose
claims would necessarily be infringed by implementing the Specification. Format Patents expressly **exclude** claims
directed to the Viorant Helix deployment engine, the Viorant Sign substrate, or any other Viorant product, except to
the extent such claims are necessarily infringed by implementing the Specification itself.

**"Conforming Implementation"** — Software that implements the Specification and satisfies at least Conformance
Level 1, including the invariants stated in `spec/v1/conformance.md`. A product that reads, writes, verifies,
converts to or from, or deploys `.vio` bundles is a Conforming Implementation to the extent it does so conformantly.

**"You"** — Any individual or legal entity exercising the rights described here, including entities under common
control with you.

## 2. The covenant

Viorant Inc. **irrevocably covenants not to assert** any Format Patent against You for making, using, selling,
offering for sale, importing or distributing a Conforming Implementation.

This covenant is:

- **Royalty-free.** No payment, licence negotiation, registration or notification is required.
- **Worldwide** and non-exclusive.
- **Automatic.** It applies to every Conforming Implementation without any action by You.
- **Irrevocable**, except as stated in section 3.
- **Binding on successors.** It runs with the Format Patents: any transferee or assignee takes them subject to it.
  Viorant Inc. will not transfer a Format Patent except subject to this covenant.

## 3. Reciprocal termination

This covenant **terminates automatically as to You** if You (or an entity you control) initiate or voluntarily join
patent litigation — including a cross-claim or counterclaim — alleging that the Specification, a Conforming
Implementation, or any implementation of the Specification by Viorant Inc. or any third party infringes a patent.

Termination applies only to the party bringing the claim and to entities it controls. Every other implementer keeps
the covenant.

This is the covenant's only teeth, and it is defensive: it costs nothing to anyone who does not attack the commons.

## 4. What is not covered

- **Non-conforming use.** The covenant extends to conformant implementation of the Specification. It does not cover
  other technology you combine with it.
- **Helix and Sign.** The Viorant Helix deployment engine and the Viorant Sign substrate are separate patent
  applications and separate products. No rights in them are granted here.
- **Trademarks.** No rights to `.vio`, `VIO`, `the VIO Project` or `VIO Conformant` are granted here. See
  [TRADEMARKS.md](TRADEMARKS.md).
- **Copyright.** Copyright licences are granted separately — Apache-2.0 for the tooling ([LICENSE](LICENSE)) and
  CC-BY-4.0 for the specification ([spec/LICENSE](spec/LICENSE)).
- **Third-party patents.** Viorant Inc. can only covenant as to patents it owns or controls.

## 5. Why this exists

A specification is worth nothing if a lawyer tells an implementer not to touch it. CC-BY-4.0 expressly grants no
patent rights (§2(b)(2)), and Apache-2.0's patent grant reaches the licensed code rather than the format as
described in prose. Without this document, a patent-holding author of a published format leaves every implementer
exposed.

The covenant keeps the patents' defensive value while removing the reason to say no. It follows the practice of
royalty-free standards commitments — W3C's patent policy, the Open Web Foundation agreements, and open
specification promises published by other patent holders.

## 6. Contact

Questions about scope: open an issue at <https://github.com/viorant/vioformat/issues>.
