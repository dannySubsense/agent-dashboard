# DDR Index — agent-dashboard

Living backlog and build-order rationale for the agent-dashboard project.

| # | Title | Status | Sprint | Depends On | Scope |
|---|---|---|---|---|---|
| 001 | Homelab Project Bootstrap Skill | ACCEPTED | bootstrap-skill-v1 | — | Platform tooling |
| 002 | Dashboard Framework and Architecture | PROPOSED | dashboard-framework-v1 | — | Core architecture |
| 003 | Project Discovery and Card Panel | BACKLOG | tbd | 002 | Feature |
| 004 | DDR Pipeline Panel | BACKLOG | tbd | 002 | Feature |
| 005 | Activity Feed | BACKLOG | tbd | 002 | Feature |
| 006 | Agent Status Panel | BACKLOG | tbd | 002 | Feature |
| 007 | Open Work Tracker | BACKLOG | tbd | 002 | Feature |
| 008 | "Where Did I Leave Off?" Panel | BACKLOG | tbd | 002 | Feature |

---

## Build Order Rationale

**DDR-001 first.** Bootstrap skill is foundational platform infrastructure — establishes the consistent repo shape the dashboard will assume when scanning projects.

**DDR-002 second.** Architectural anchor for all feature DDRs. No feature sprint starts without it accepted.

**DDR-003 next.** Project discovery and card panel is the load-bearing feature — it proves the data pipeline (git + LORE + CLAUDE.md parsing) and produces the primary UI surface everything else hangs off.

**DDR-004–008** can be sequenced flexibly once 003 ships. Simpler panels (004, 007) may batch into a single sprint; richer panels (005, 006, 008) each warrant their own.

**DDR-001 and DDR-002 sprints run in parallel** — they are independent.

---

## Decisions Pre-Resolved (DDR-001)

- `/new-project` skill: authored in agent-dashboard, installed globally to `~/.claude/commands/`
- Templates (`HOMELAB-CLAUDE.md.template`, `MACHINE-SETUP.md.template`): owned by agent-lore at `~/runtime/agent-lore/`
- Scope boundary: bootstrap skill stops at git/GitHub/LORE layer; stack init is project-level
