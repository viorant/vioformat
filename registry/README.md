# Adapter id registry

A `.vio` declares **which** adapter it expects; a deployer implements it. The id is a name, not a semantic.

- **Readers** accept an id they do not recognise. This is the format's one open value set — see
  [ADR-038](../spec/adr/ADR-038-adapter-declaration-surface.md).
- **Deployers** that lack an adapter for a declared id fail the deploy explicitly with `adapter_unavailable`,
  naming the id and kind. They never substitute.

## Registering an id

Open a pull request adding a row to [`adapters.yaml`](adapters.yaml) with the id, kind and maintainer.

**Anyone may register. Registration is not gated by any implementation, Viorant's included.** Reserving a name is
not a claim that a deployer supports it — `status` records that separately, and per implementation.

Write the adapter itself against the open adapter SDK: <https://github.com/viorant/helix-adapter-sdk>.
