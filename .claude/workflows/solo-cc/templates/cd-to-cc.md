---
description: "Handoff template for CD dispatching tasks directly to CC (solo workflow)"
status: active
---

# HANDOFF TEMPLATE — CD → CC (Solo-CC)
#
# Use this template for the solo-cc workflow — direct CD-to-CC delegation.
# Same format as the global HANDOFF_TEMPLATE.md.
#
# Fill in fields. Delete all lines starting with #.
# Save to: .jdev/state/HANDOFF.md
#
# ┌─ PRINCIPLES ───────────────────────────────────────────┐
# │                                                        │
# │ CD defines WHAT, WHY, and DONE.                        │
# │ CC decides HOW.                                        │
# │                                                        │
# │ Tasks section:                                         │
# │   GOOD — describe the problem and desired outcome      │
# │   GOOD — file/module names, behavior requirements,     │
# │          constraints, context for WHY                   │
# │   BAD  — code snippets, line numbers, import           │
# │          statements, function signatures                │
# │                                                        │
# └────────────────────────────────────────────────────────┘

# HANDOFF: {title}

- handoff_id: {8-char hex}
- created_at: {ISO 8601 UTC}

**Skill:** {name | "none"}  **Agent:** CC  **Type:** {type}  **Complexity:** {simple | standard | complex}
**Scope:** {inline | pointer → path}

## Tasks
{WHAT and WHY — CC decides HOW}

## Verify
{Acceptance criteria — CC decides test approach}

## Commit
`{conventional commit message}`
