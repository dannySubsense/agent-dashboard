# DDR Index — agent-dashboard

Living backlog and build-order rationale for the agent-dashboard project.

| # | Title | Status | Sprint | Depends On | Scope |
|---|---|---|---|---|---|
| 001 | Homelab Project Bootstrap Skill | ACCEPTED | bootstrap-skill-v1 | — | Platform tooling |

---

## Build Order Rationale

**DDR-001 first.** The bootstrap skill is foundational platform infrastructure — it establishes the consistent repo shape that every subsequent homelab project will have, which is the shape the dashboard UI will assume when it scans projects. Shipping it before the dashboard DDRs means future projects start correctly from day one.

Dashboard feature DDRs (data aggregation, UI panels, LORE integration, GitHub API, Switchboard feed) follow DDR-001.

---

## Decisions Pre-Resolved (DDR-001)

- `/new-project` skill: authored in agent-dashboard, installed globally to `~/.claude/commands/`
- Templates (`HOMELAB-CLAUDE.md.template`, `MACHINE-SETUP.md.template`): owned by agent-lore at `~/runtime/agent-lore/`
- Scope boundary: bootstrap skill stops at git/GitHub/LORE layer; stack init is project-level
