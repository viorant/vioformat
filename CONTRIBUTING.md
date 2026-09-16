# Contributing

## Proposing a change to the format

Open an issue using the **Format proposal** template. A proposal states:

1. The problem, in terms of what a producer or consumer cannot do today.
2. Alternatives considered, and why they were rejected.
3. The change to the specification text.
4. A **compatibility statement** — required for any change touching the reserved value sets, a digest subject, or
   the canonical form: what existing bundles do under the change, and whether producers or consumers ship first.

Accepted proposals are recorded as an ADR in [`spec/adr/`](spec/adr/) and land in a numbered specification revision.
The proposer is credited on that revision in [CONTRIBUTORS.md](CONTRIBUTORS.md).

## Adding a conformance case

Every normative statement should be reachable by a fixture.

1. Add the bundle to `examples/valid/` or `examples/invalid/`.
2. An invalid fixture carries **exactly one** violation, named in its filename and in a leading comment citing the
   section it violates.
3. Register it in [`conformance/v1/cases.yaml`](conformance/v1/cases.yaml) with its expected outcome and rule id.
4. Run `cd tools/vio-lint && npm test`.

## Submitting an implementation

Readers, verifiers, deployers, adapters and converters are listed on the website's Ecosystem page once they pass a
[conformance level](spec/v1/conformance.md). Open an issue with the **Implementation** template stating the level
claimed and the conformance run output.

## Sign-off (DCO)

Every commit must carry a `Signed-off-by` line certifying the
[Developer Certificate of Origin](https://developercertificate.org/) 1.1:

```bash
git commit -s -m "spec: clarify the memory digest subject"
```

```
Signed-off-by: Your Name <you@example.com>
```

**There is no CLA, and there will not be one.** A CLA preserves the maintainer's ability to relicense later; not
collecting that option is how the VIO Project commits to staying permissively licensed. Contributions are licensed
under the licence governing the directory they land in — CC-BY-4.0 for `spec/`, `schema/`, `examples/`,
`conformance/` and `registry/`; Apache-2.0 elsewhere.

Contributing to `spec/` does not transfer patent rights. The project's patent position is the covenant in
[PATENTS.md](PATENTS.md); Apache-2.0 §5 governs patent grants in contributed code.

## Style

- The specification is normative prose. Prefer "a conforming reader rejects" over "you should not".
- State the reasoning for a rule where the rule is non-obvious. The memory `layer` section is the model: the rule,
  then why the alternative was wrong.
- Do not describe unbuilt behaviour as shipped. The implemented-subset section is the place for the gap.
