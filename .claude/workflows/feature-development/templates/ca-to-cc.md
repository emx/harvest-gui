---
description: "Handoff template for CA dispatching implementation work to CC"
status: active
---

# HANDOFF TEMPLATE — CA → CC (Feature Development: Implementation)
#
# Use this template when dispatching Phase 2 of the feature-development
# workflow. CC will implement per the design doc.
#
# Fill in fields. Delete all lines starting with #.
# Save to: .jdev/state/HANDOFF.md (CC's inbox)
#
# ┌─ PRINCIPLES ───────────────────────────────────────────┐
# │                                                        │
# │ CA defines WHAT to build and points to the design.     │
# │ CC decides HOW to implement it.                        │
# │                                                        │
# │ Tasks section:                                         │
# │   GOOD — deliverables, design doc reference,           │
# │          acceptance criteria, constraints               │
# │   BAD  — code snippets, implementation patterns,       │
# │          line-by-line instructions                      │
# │                                                        │
# └────────────────────────────────────────────────────────┘

# HANDOFF: {title}

- handoff_id: {8-char hex}
- created_at: {ISO 8601 UTC}

**Skill:** none  **Agent:** CC  **Type:** feature  **Complexity:** {simple | standard | complex}
**Scope:** pointer → {path to design doc}

## Tasks

{Summary of what to implement — CC should read the design doc for full details}

Deliverables:
{Numbered list of concrete deliverables}

## Reference

Read `{design doc path}` in full before starting. Key sections:
{List the most important sections for CC to focus on}

## Verify

{Acceptance criteria — tests, lint, specific behaviors}

## Commit
`feat({scope}): D-{NN} {title} — {summary}`
