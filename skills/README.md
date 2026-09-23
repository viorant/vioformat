# AI skills

Skills an agent or coding assistant loads when working with the `.vio` artifact format. Each is a directory with a
`SKILL.md` — the same shape the format itself packages as a declarative skill artifact, which is deliberate: a skill
here can be exported into a `.vio` unchanged.

| Skill | Use when |
|---|---|
| [`vio-authoring`](vio-authoring/) | Writing, reviewing or debugging a `.vio` bundle |

Planned: `vio-conversion` (Agent Format / ADL → `.vio`), `vio-review` (capability-surface review of a bundle before deploy).
