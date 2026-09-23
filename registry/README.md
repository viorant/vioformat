# Adapter id registry

A `.vio` declares **which** adapter it expects; a deployer implements it. The id is a name, not a semantic.

- **In VIO 1.0, readers do *not* accept an id they do not recognise.** `manifest.framework` is a closed set —
  `crewai`, `langchain`, `autogen` — and every other value is rejected, registry-reserved ids included. Memory and
  target adapter ids have no declaration surface in a bundle at all yet.
- **Registration reserves the name**, records who maintains the adapter, and lets tooling and documentation refer
  to it. It does not change what a 1.0 reader accepts. Opening the set is a format change; the open-value-set
  design is [ADR-038](../spec/adr/ADR-038-adapter-declaration-surface.md), targeted at `vio: 2`. See errata
  `E-007`.
- **Deployers** that lack an adapter for a declared id fail the deploy explicitly with `adapter_unavailable`,
  naming the id and kind. They never substitute.

## Registering an id

Open a pull request adding a row to [`adapters.yaml`](adapters.yaml) with the id, kind and maintainer.

**Anyone may register. Registration is not gated by any implementation, Viorant's included.** Reserving a name is
not a claim that a deployer supports it — `status` records that separately, and per implementation.

Write the adapter itself against the open adapter SDK: <https://github.com/viorant/helix-adapter-sdk>.
