---
description: "Handoff template for CD dispatching design + plan work to CA"
status: active
---

# HANDOFF TEMPLATE — CD → CA (Feature Development: Design + Plan)
#
# Use this template when dispatching Phase 1 of the feature-development
# workflow. CA will design, run Grok review, and prepare CC handoff.
#
# Fill in fields. Delete all lines starting with #.
# Save to: .jdev/state/actors/ca/HANDOFF.md
#
# ┌─ PRINCIPLES ───────────────────────────────────────────┐
# │                                                        │
# │ CD defines the feature goal and constraints.           │
# │ CA decides the design approach and review strategy.    │
# │                                                        │
# │ Tasks section:                                         │
# │   GOOD — feature goal, user-facing behavior,           │
# │          constraints, dependencies, context             │
# │   BAD  — specific design patterns, file structures,    │
# │          implementation details                         │
# │                                                        │
# └────────────────────────────────────────────────────────┘

# HANDOFF: {title}

- handoff_id: {8-char hex}
- created_at: {ISO 8601 UTC}

**Skill:** none  **Agent:** ca  **Type:** feature  **Complexity:** complex
**Scope:** inline

## Tasks

{Feature goal and context — what problem are we solving and why}

Deliverables:
1. Design document in `docs/staging/{NN}-{TITLE}.md`
2. Grok review cycle — gate must pass (0 Real findings)
3. CC implementation handoff using `ca-to-cc.md` template

## Constraints

{Any architectural constraints, compatibility requirements, or non-goals}

## Verify

- Design doc written with proper frontmatter
- Grok review gate passed (0 Real findings in final round)
- CC handoff prepared with clear scope and verify criteria
- STATUS → COMPLETE with references to design doc and handoff draft

## Commit
`docs(design): D-{NN} {title} — design + Grok review`
