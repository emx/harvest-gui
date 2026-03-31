---
name: solo-cc
description: "Direct CD-to-CC task delegation — formalizes the current operating model"
actors: [cd, cc]
chain: cd → cc
delegation: strict
owner_access: []
status: active
category: workflow
consumer: both
enforcement: advisory
---

# Workflow: Solo-CC

## Actor Roles

| Actor | Role |
|-------|------|
| **CD** (Chief Designer) | Dispatches tasks directly to CC. Reviews recitation artifact at completion. Reviews result. |
| **CC** (Chief Coder) | Implements tasks. Reports via STATUS.md. |

## Delegation Chain

```
CD → CC        (delegation: strict)
CC → CD        (escalation: direct)
```

## Phases

Single phase:

| Element | Value |
|---------|-------|
| Delegator | CD |
| Executor | CC |
| Template | `templates/cd-to-cc.md` (same format as global `HANDOFF_TEMPLATE.md`) |
| Entry criteria | Task defined |
| Exit criteria | CC COMPLETE, verification passes |
| Escalation | CC → BLOCKED → CD reviews |

**What happens:**
1. CD writes HANDOFF to CC
2. CC claims task, transitions to working, writes recitation artifact, implements
3. CC writes STATUS → COMPLETE
4. Supervisor triggers verification
5. CD reviews result

## When to Use

- Simple tasks (single feature, bug fix, documentation)
- Tasks that don't require design review or architectural planning
- Tasks where CD has clear implementation requirements
- Any task where the overhead of CA coordination exceeds the value

## Relationship to Feature-Development

`solo-cc` is NOT a subset of `feature-development` — it's a separate workflow. CD chooses which workflow to use based on task complexity at dispatch time.

| Factor | solo-cc | feature-development |
|--------|---------|---------------------|
| Design review needed | No | Yes (Grok review) |
| Multi-file architecture | Simple | Complex |
| Implementation risk | Low | Medium-High |
| CA involvement | None | Full lifecycle |
| Typical duration | Single session | Multi-session |

## Handoff Templates

| Step | Template | Description |
|------|----------|-------------|
| CD → CC | `templates/cd-to-cc.md` | Standard task handoff (same format as global template) |
