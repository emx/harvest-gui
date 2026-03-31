---
name: grok-review
version: 2
consumer: cd, ca
tags: [review, quality, grok]
triggers:
  - design doc ready for external review
  - investigation report needs validation
  - any artifact that must be reviewed before implementation
  - "grok review"
  - "external review"
  - "send to grok"
description: End-to-end Grok external review cycle — prepare, invoke, triage, gate
revised: 2026-02-23
revision_note: "v2 — operational validation hardening after D-52 post-mortem"
---

# Grok Review Skill

> **Consumer:** CD (orchestrator), CA (architect)
> **Purpose:** Run structured external reviews through the `jdev grok-review` pipeline.
> **Process authority:** `methodology/processes/GROK_REVIEW_PROCESS.md`
> **Prompt template:** `methodology/templates/GROK_REVIEW_PROMPT_TEMPLATE.md`

---

## Overview

Grok reviews use the `jdev grok-review` CLI command, which calls the xAI API, parses the response, writes output files, and logs to JOURNAL.md.

**Who runs the command:**
- **CD** runs `uv run jdev grok-review` directly (CD has shell access via Claude Code). CD can handle the full review cycle: prepare prompt, dry-run, invoke, triage.
- **CA** has shell access and runs `jdev grok-review` directly via `uv run jdev grok-review`. CA handles the full cycle: prepare prompt, dry-run, invoke, triage.

---

## Two Modes

### Auto-Generated Mode

For straightforward reviews where the standard template works. CD provides the artifact path, questions, and optional constraints. The pipeline wraps them in a standard prompt.

```bash
jdev grok-review <artifact-path> \
  -q "question 1,question 2,question 3" \
  -c "constraint 1,constraint 2" \
  -o docs/research/<topic>
```

**When to use:** Simple design reviews with ≤5 short questions. No attachments needed beyond the artifact itself.

### Custom Prompt Mode

For complex reviews where CD needs full control over the prompt: multi-section questions, architectural context, scenario matrices, code attachments.

```bash
jdev grok-review \
  --prompt <prompt-file> \
  --attach <file1> \
  --attach <file2>:func1,func2 \
  -o docs/research/<topic>
```

**When to use:** Most reviews. The custom prompt gives CD full control over framing, context, and question structure.

**Custom mode is the default recommendation.** The extra 10 minutes writing a proper prompt file pays back in review quality.

---

## The Cycle

```
PREPARE → DRY RUN → INVOKE → TRIAGE → (REVISE → INVOKE)* → GATE
```

Maximum 3 rounds. Zero Real findings after any triage → skip to gate.

---

## Stage 1: PREPARE

### 1.1 Readiness Check

Before writing anything, verify:

- [ ] No other Grok review cycle is in progress
- [ ] The artifact reflects current state (not aspirational)
- [ ] Open decisions separated from settled ones
- [ ] CD has 4-7 specific, answerable questions
- [ ] **Operational trace complete** — the primary happy path has been traced end-to-end, with a concrete mechanism at every step (see §1.6)
- [ ] **No red-flag language on the critical path** — no step in the happy path uses "workaround", "interim", "manual intervention", "assumed to be configured", or "deferred" (see Rule 9)
- [ ] **Non-Goals reviewed for critical-path impact** — every item in Non-Goals or Deferred has been checked: if it touches the happy path, it's not deferrable and must be resolved before review

If the artifact isn't ready, fix it first. Bad input guarantees bad output.

### 1.2 Create Output Directory

All review files live under `docs/research/<topic>/` where `<topic>` is a kebab-case slug (e.g., `cd-dispatch`, `multi-actor-transport`).

Create the directory using Filesystem MCP:
```
docs/research/<topic>/
```

### 1.3 Write the Prompt File

Write the prompt to `docs/research/<topic>/GROK_<TOPIC>_REVIEW_PROMPT.md`.

**Follow the template in `methodology/templates/GROK_REVIEW_PROMPT_TEMPLATE.md`.**

Required sections for R1:

| Section | Content |
|---------|---------|
| **Who You Are** | Grok's role, prior review count, anti-sycophancy |
| **What jdev Is** | Actor list + coordination model (always include, even for R2+) |
| **What You're Reviewing** | Why now, what's blocked, what breaks if wrong |
| **Architectural Context** | Relevant constraints, prior decisions, key code references |
| **Operational Trace** | Happy path traced step-by-step with concrete mechanisms |
| **Questions** | 4-7 numbered Q-groups with 2-3 sub-questions each |
| **Ground Rules** | Simplify, be concrete, prioritize, think at scale, flag risks, trace runtime |
| **Appendix** | Full artifact text (pasted at end of prompt file) |

**Critical for R2+:** Add a **Review Round Context** section with disposition table, changes since R1, focus for this round, and settled decisions. See the template for exact format.

### 1.4 Identify Attachments

Attachments are source files that give Grok the code context to review properly.

**Full file attachment:**
```
--attach jdev/reactors/handoff.py
```

**Selective symbol extraction** (Python files only — extracts specific functions/classes using AST):
```
--attach jdev/status.py:Status,_HANDOFF_ALLOWED
--attach jdev/environment.py:cmd_dispatch,validate_handoff
```

Symbol extraction is preferred for large files. It keeps the prompt focused and under context window limits.

**Attachment selection criteria:**
- Include files that contain code paths discussed in the questions
- Include files on the operational trace's critical path
- Include enum definitions, config constants, and type definitions that constrain the design
- Skip test files unless the review is specifically about test design
- Skip files over 500 lines — use symbol extraction instead

### 1.5 Document Nature Constraint

Express the document's nature as a constraint in the prompt. This steers Grok's worldview and prevents category errors.

Examples:
- *"This is a software design for a file-based state machine. Evaluate against: atomic writes, single-writer principle, enum-based status classification."*
- *"This is an advisory human process, not code. Evaluate clarity and actionability. Do not demand software enforcement."*
- *"This is a partially-implemented design. Phases 1-3 are shipped. Focus on Phases 4-5."*

### 1.6 Operational Trace

Before any review prompt is written, the author must trace the primary happy path from trigger to outcome. For each step, state the concrete mechanism that makes it work.

**The trace is the single most important quality gate in PREPARE.** A design that cannot be traced end-to-end is not ready for review — it's ready for more design work.

**How to trace:**

1. Identify the primary trigger (e.g., "user runs `jdev start`")
2. Walk each step to the final outcome (e.g., "CD dispatches handoff to CA")
3. At each step, name the concrete mechanism: which function, which file, which env var, which config entry
4. If any step says "assumed", "configured externally", "manual step", or "deferred" — stop. That's a gap.

**Example (multi-actor launch):**
```
1. User runs `jdev start` → calls _create_tmux_tabs() in environment.py
2. Tab creation iterates project.yaml tabs → creates tmux windows with commands
3. Each actor window command includes `export JDEV_ACTOR=<name>;` prefix
4. Claude Code inherits JDEV_ACTOR from shell environment on startup
5. SessionStart hook reads JDEV_ACTOR → resolves per-actor state paths
6. PreToolUse hook reads JDEV_ACTOR → applies actor-specific deny list

Every step has a function, a file, and a deterministic mechanism. No gaps.
```

**Counter-example (what D-52 had):**
```
3. JDEV_ACTOR is set via tmux send-keys after window creation
4. "Manual export is a valid interim workaround" ← RED FLAG: gap on critical path
```

The trace goes into the prompt as a required section (see template). Grok validates the trace as Q1 or Q2.

---

## Stage 2: DRY RUN

Always dry-run first. This writes the assembled prompt to disk without calling the API, so CD can verify the prompt quality.

Tell the human:
```bash
jdev grok-review --prompt docs/research/<topic>/GROK_<TOPIC>_REVIEW_PROMPT.md \
  --attach <file1> \
  --attach <file2>:symbol1,symbol2 \
  -o docs/research/<topic> \
  --dry-run
```

The pipeline writes the assembled prompt (with attachments inlined) to `docs/research/<topic>/GROK_<TOPIC>_REVIEW_PROMPT_R1.md`.

CD reads the assembled file and checks:
- [ ] All attachments resolved correctly
- [ ] No truncation warnings
- [ ] Questions are clear and specific
- [ ] Context is sufficient but not overwhelming
- [ ] Operational trace is present and has no gaps

If issues, fix the prompt file and re-run dry run.

---

## Stage 3: INVOKE

Remove `--dry-run`:

```bash
jdev grok-review --prompt docs/research/<topic>/GROK_<TOPIC>_REVIEW_PROMPT.md \
  --attach <file1> \
  --attach <file2>:symbol1,symbol2 \
  -o docs/research/<topic>
```

The pipeline:
1. Assembles prompt + attachments
2. Sends to xAI API
3. Parses response (verdict, confidence, findings with severity)
4. Writes `GROK_<TOPIC>_REVIEW_RESPONSE_R1.md` with YAML frontmatter
5. Logs [GROK] entry to JOURNAL.md
6. Prints summary (verdict, confidence, finding counts)

**Output files:**
```
docs/research/<topic>/
  GROK_<TOPIC>_REVIEW_PROMPT_R1.md     ← assembled prompt (record)
  GROK_<TOPIC>_REVIEW_RESPONSE_R1.md   ← Grok's response with frontmatter
```

Round numbers auto-increment. The pipeline detects existing response files and assigns the next round number.

---

## Stage 4: TRIAGE

CD reads the response and classifies each finding. **This is the highest-judgment step.**

| Classification | Meaning | Action |
|---|---|---|
| **Real** | Genuine gap we missed | Address in revision |
| **Partial** | Has merit but overstates | Address the real part, constrain the rest |
| **Addressed** | Already handled | Add to constraints for next round |
| **Rejected** | We disagree, with rationale | Document rationale, add to constraints |
| **Deferred** | Valid, out of scope | Log in future work |
| **Categorical** | Rephrased version of a Rejected finding | Note as repeat, does not count at gate |

### Post-Acceptance Impact Check

**For every finding classified as REAL:** Before incorporating the fix into the design, trace it against the operational happy path. Ask:

1. Does this fix contradict any other part of the design?
2. Does this fix block a path that was previously open?
3. Does this fix interact with another REAL finding's fix?

If the answer to any is yes, the fix needs revision before incorporation. Two individually correct fixes can create a contradiction when applied together.

**This is what caught D-52:** Grok found that CD's deny list was missing other actors' state dirs (REAL). CD added `.jdev/state/actors/cc/` to CD's deny list. But CD dispatches by writing HANDOFF.md to `.jdev/state/actors/cc/HANDOFF.md`. The fix blocked CD's own dispatch path. The contradiction was invisible because each fix was evaluated in isolation.

**Persist triage** by appending to the response file:

```markdown
## Triage (CD, YYYY-MM-DD) — Round N of 3

| Finding | Classification | Action | Impact Check |
|---|---|---|---|
| Q1: <topic> | REAL | <what to do> | No path conflicts |
| Q2: <topic> | REAL | <what to do> | Checked against Q1 fix — no contradiction |
| Q3: <topic> | ADDRESSED | Already in §3.2 | — |
| ... | ... | ... | ... |

**Real findings:** N
**Categorical:** N
**Trajectory:** Round 1: X Real → Round N: Y Real
**Assessment:** Converging | Stalled | Diverging
**Impact check:** All REAL fixes traced against happy path — no contradictions
```

---

## Stage 5: REVISE (if Real findings > 0)

Address Real findings in the artifact. Be surgical:
- Tighten existing text, don't add new sections
- Every line added is attack surface for the next round
- If a Real finding requires implementation work, create a handoff and complete it before Round 2
- After all REAL fixes are applied, re-run the operational trace from §1.6 against the revised design to verify end-to-end coherence

---

## Stage 6: ROUND 2+ (if needed)

For Round 2+, update the prompt file with:
1. **Round context:** Disposition table, changes since R1, focus for this round
2. **Settled decisions:** List locked decisions in ground rules
3. **Operational re-trace:** Updated happy path trace reflecting all R1 fixes (see template)
4. **Questions:** Each references the specific R1 finding it validates. **Q1 or Q2 must be an operational re-trace question** asking Grok to verify the full path still works with all fixes applied together.
5. **Appendix:** Updated artifact text

Use verification-style questions: "Has the revision addressed [finding]?" / "Any new risks from [change]?"

Always end with: "Rate the updated artifact A/B/C. Delta from R1. One thing to fix before building."

---

## Stage 7: GATE

**Primary metric: triage trajectory, not Grok's verdict.**

| Triage Trajectory | Action |
|---|---|
| Real → 0 | Promote (regardless of Grok's verdict) |
| Real → 1-2 | One more round with verification questions |
| Real flat | Pause — reassess document or questions |
| Real increasing | Revert revision — it made things worse |

**After 3 rounds with Real findings still appearing:** The design has structural problems. Archive and restart.

---

## Quick Reference: Command Templates

### R1 Custom Review (most common)
```bash
# Dry run first
jdev grok-review \
  --prompt docs/research/<topic>/GROK_<TOPIC>_REVIEW_PROMPT.md \
  --attach jdev/reactors/handoff.py \
  --attach jdev/status.py:Status,_HANDOFF_ALLOWED \
  -o docs/research/<topic> \
  --dry-run

# Then for real
jdev grok-review \
  --prompt docs/research/<topic>/GROK_<TOPIC>_REVIEW_PROMPT.md \
  --attach jdev/reactors/handoff.py \
  --attach jdev/status.py:Status,_HANDOFF_ALLOWED \
  -o docs/research/<topic>
```

### R1 Auto-Generated (simple reviews)
```bash
jdev grok-review docs/evolution/design/draft/SOME_DESIGN.md \
  -q "Is the state model sound?,What failure modes exist?,What's missing?" \
  -c "File-based coordination is settled,Polling architecture not up for redesign" \
  -o docs/research/<topic>
```

### Pre-flight Check
```bash
jdev grok-ping     # Verify API connectivity
jdev grok-models   # List available models
```

---

## File Naming Convention

| File | Pattern |
|------|---------|
| CD's prompt (source) | `GROK_<TOPIC>_REVIEW_PROMPT.md` |
| Assembled prompt R1 | `GROK_<TOPIC>_REVIEW_PROMPT_R1.md` |
| Response R1 | `GROK_<TOPIC>_REVIEW_RESPONSE_R1.md` |
| Assembled prompt R2 | `GROK_<TOPIC>_REVIEW_PROMPT_R2.md` |
| Response R2 | `GROK_<TOPIC>_REVIEW_RESPONSE_R2.md` |

The pipeline auto-generates filenames. CD only writes the source prompt file.

---

## Anti-Patterns

| Anti-Pattern | Why It Fails | Do Instead |
|---|---|---|
| Using auto mode for complex reviews | Standard template lacks context depth | Use custom prompt mode |
| Skipping dry run | Broken attachments, missing context | Always dry-run first |
| Attaching entire large files | Fills context window with noise | Use symbol extraction (`:func1,func2`) |
| Vague questions ("What do you think?") | Gets generic praise | Ask specific sub-questions with 2-3 parts |
| No constraints on R2+ | Grok re-litigates settled decisions | Carry all prior constraints forward |
| Asking "Is this ready?" | Anti-sycophancy guarantees "no" | Ask "What problems exist in X?" |
| Chasing APPROVED verdict | May never come for complex docs | Gate on triage trajectory, not verdict |
| Building during review | Defeats the gate | Review before build, always |
| Writing prompt from memory | Misses template structure | Read the template every time |
| Naming source file `GROK_*_REVIEW_PROMPT.md` | Pipeline wraps topic in `GROK_{topic}_REVIEW_PROMPT_R{n}.md` — double-prefix | Name source file as plain topic: `CD_DISPATCH_PROTOCOL.md`, not `GROK_CD_DISPATCH_REVIEW_PROMPT.md` |
| Deferring critical-path items | Design ships "complete" but doesn't work at runtime | If it's on the happy path, it's a blocker — not a deferral |
| Reviewing only architecture, not operations | Internally consistent design that fails when it runs | Always include operational trace + operational validation question |
| Accepting REAL findings without impact check | Individually correct fixes that contradict each other | Trace every REAL fix against the happy path before incorporating |

---

## Rules

1. **Review before build.** No implementation handoff until Round 1 is triaged.
2. **One review at a time.** Complete or abort before starting another.
3. **Abort is always available.** Don't burn rounds on doomed documents.
4. **Dry-run first.** Always. No exceptions.
5. **Custom prompt for anything non-trivial.** The 10 minutes pays back.
6. **Read the template.** `methodology/templates/GROK_REVIEW_PROMPT_TEMPLATE.md` before writing any prompt.
7. **Triage decides, not Grok.** CD classifies findings. Grok generates problems. Human judges.
8. **Operational validation is mandatory.** Every review prompt must include an operational trace and an operational validation question. Every triage must verify the reviewer evaluated the runtime path, not just the architecture. A design that "acknowledges and defers" a critical-path gap is not approved — it's blocked.
9. **Red-flag words block on the critical path.** If any step in the operational trace uses "workaround", "interim", "manual intervention", "assumed to be configured", or "deferred" — the design is not ready for review. Fix the gap or remove the claim that the design solves that path.
