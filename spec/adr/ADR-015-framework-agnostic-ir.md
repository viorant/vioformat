# ADR-015 — Framework-agnostic IR

**Status:** Accepted · **Author:** Adi Vora

The intermediate representation that becomes the `.vio` artifact bodies: framework-neutral sections, variables and
bindings, with CrewAI as the first adapter target and further frameworks as later validation. The format carries the
neutral form; a FrameworkAdapter assembles the native form at instantiate.
