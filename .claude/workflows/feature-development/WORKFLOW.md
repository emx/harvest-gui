---
name: feature-development
description: "Multi-step feature development with design, review, and verified implementation"
actors: [cd, ca, cc]
chain: cd → ca → cc
delegation: strict
owner_access: [ca]
status: active
category: workflow
consumer: both
enforcement: advisory
---

# Workflow: Feature Development

## Actor Roles

| Actor | Role |
|-------|------|
| **CD** (Chief Designer) | Receives feature idea from human. Dispatches design and implementation management to CA. Reviews CA's output at phase boundaries. Makes strategic decisions when CA escalates. |
| **CA** (Chief Architect) | Plans features: writes design docs, runs Grok reviews, prepares implementation handoffs. Manages CC during implementation: dispatches work, verifies results, handles rework cycles. Escalates blockers to CD. |
| **CC** (Chief Coder) | Implements features per CA's handoff. Writes code, tests, documentation. Reports progress via STATUS.md. Escalates blockers to CA. |

## Delegation Chain

```
CD → CA → CC       (delegation: strict)
CC → CA → CD       (escalation: strict)
Human → CA         (owner intervention: logged)
```

**Strict delegation means:**
- CD never dispatches directly to CC. All implementation flows through CA.
- CC never escalates directly to CD. All blockers flow through CA.
- CA is the mandatory coordination layer for all implementation work.

**CC autonomy within scope:** Strict delegation does NOT mean CC escalates every minor issue. CC has full autonomy to make scoped decisions within the handoff's scope. CC only escalates to CA (via BLOCKED) when the issue is outside the handoff scope or requires a design-level decision.

## Phases

### Phase 1: Design + Plan

| Element | Value |
|---------|-------|
| Delegator | CD |
| Executor | CA |
| Template | `cd-to-ca.md` |
| Entry criteria | Feature idea articulated (from human or CD discussion) |
| Exit criteria | Design doc written, Grok review gate passed (0 Real findings), CC handoff prepared |
| Escalation | CA → CD if design direction unclear or requires human decision |

**What happens:**
1. CD writes HANDOFF to CA using `cd-to-ca.md` template
2. CA writes design document in `docs/staging/`
3. CA runs Grok review cycle via `jdev grok-review` CLI
4. CA pre-classifies findings and escalates Real/BLOCKING findings to CD for triage
5. CA revises design per triage, iterates until gate passes
6. CA prepares CC handoff using `ca-to-cc.md` template
7. CA writes STATUS → COMPLETE with design doc + handoff draft references

**Sub-process:** Grok review follows `processes/GROK_REVIEW_PROCESS.md`. CA handles obvious classifications (Addressed, Rejected) autonomously. Real and ambiguous findings are escalated to CD for triage.

**Split option:** CD may dispatch Phase 1 as design-only and Phase 2 as planning-only when complexity warrants separate review. The combined phase is the default.

### Phase 2: Implementation

| Element | Value |
|---------|-------|
| Delegator | CA |
| Executor | CC |
| Template | `ca-to-cc.md` |
| Entry criteria | CA has prepared and dispatched the CC handoff |
| Exit criteria | CC writes STATUS → COMPLETE, verification passes |
| Escalation | CC → BLOCKED → CA reviews → either resolves or escalates to CD |

**What happens:**
1. CA dispatches handoff to CC (writes HANDOFF.md, supervisor routes it)
2. CC claims task, transitions to working, writes recitation artifact, implements
3. CC writes STATUS → COMPLETE
4. Supervisor triggers verification
5. If verification passes → Phase 3. If verification fails → CA reviews, dispatches a new fix handoff.

**Rework loop:** CA reviews CC's STATUS at COMPLETE, creates a new fix handoff if needed. CC implements and re-submits.

**Return to design:** If CC's implementation reveals a fundamental design flaw:
1. CC writes BLOCKED with explanation
2. CA confirms the design flaw
3. CA writes BLOCKED on its own STATUS.md (escalating to CD) with a redesign recommendation
4. CD decides: revise design (return to Phase 1) or accept the deviation

### Phase 3: Completion

| Element | Value |
|---------|-------|
| Delegator | — |
| Executor | CA |
| Entry criteria | CC's work verified, all phases complete |
| Exit criteria | CA writes STATUS → COMPLETE to CD |
| Escalation | — |

**What happens:**
1. CA confirms CC's verified work
2. CA writes STATUS → COMPLETE to its own status file (CD's handoff)
3. Supervisor notifies CD
4. CD reviews final result

## Phase Diagram

```
                    CD dispatches
                         │
                         ▼
              ┌─────────────────────┐
              │  Phase 1:           │
              │  Design + Plan      │
              │  CD → CA            │
              │  CA designs + Grok  │
              │  CA prepares CC     │
              │  handoff            │
              └──────────┬──────────┘
                         │ gate passed + handoff ready
                         ▼
              ┌─────────────────────┐
              │  Phase 2:           │
              │  Implementation     │
              │  CA → CC            │◄──── rework loop
              │  CC builds + verify │      (CA ↔ CC)
              └──────────┬──────────┘
                    ╱          ╲
             verified     design flaw
                  │              │
                  ▼              ▼
    ┌──────────────────┐  CA → BLOCKED → CD
    │  Phase 3:        │  decides: revise
    │  Completion      │  or accept
    │  CA → CD         │       │
    │  CD reviews      │       ▼
    └──────────────────┘  return to Phase 1
                          (narrowed scope)
```

## Escalation Paths

| Source | Destination | Trigger | Mechanism |
|--------|------------|---------|-----------|
| CC | CA | CC writes BLOCKED | Supervisor detects, notifies CA |
| CA | CD | CA writes BLOCKED on its STATUS.md | Supervisor detects, notifies CD |
| CA | CD | Grok triage needed | CA includes triage request in STATUS update |
| CD | Human | Strategic decision required | CD presents options in conversation |

## Recitation and Review Authority

| Delegation Step | Reciter | Reviewer |
|-----------------|---------|----------|
| CD → CA | CA writes recitation artifact, proceeds immediately | CD reviews artifact at COMPLETE |
| CA → CC | CC writes recitation artifact, proceeds immediately | CA reviews artifact at COMPLETE |

Each step follows the full recitation protocol (`.claude/RECITE.md`). There is no confirmation handshake — the actor proceeds after writing the recitation artifact.

## Handoff Templates

| Step | Template | Description |
|------|----------|-------------|
| CD → CA | `templates/cd-to-ca.md` | Design + plan phase handoff |
| CA → CC | `templates/ca-to-cc.md` | Implementation phase handoff |

## When to Use

- Requires Grok design review
- Touches >3 files with architectural impact
- Requires new test infrastructure or patterns
- Implementation risk is medium-high
- Estimated duration spans multiple sessions
- Human/CD flagged as "significant"

**Rule of thumb:** If CD would want CA to review the implementation plan before CC starts building, use this workflow.
