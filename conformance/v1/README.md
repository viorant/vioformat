# Conformance suite — format version 1

[`cases.yaml`](cases.yaml) is the machine-readable case manifest: one row per fixture, with the expected outcome and
the rule id a conforming implementation must report.

Fixture discipline:

- A **valid** fixture exercises a feature of the format and must be accepted.
- An **invalid** fixture carries **exactly one** violation, named in its filename and in a leading comment citing the
  section it violates.

Levels 2 (Verifier) and 3 (Deployer) need signed fixtures and a key registry; those suites land with Viorant Sign.
See [`spec/v1/conformance.md`](../../spec/v1/conformance.md).
