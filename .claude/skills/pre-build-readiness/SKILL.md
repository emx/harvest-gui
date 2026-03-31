---
name: pre-build-readiness
version: "1.0"
consumer: both
enforcement: advisory
escape_hatch: flag
category: protocol
triggers:
  - before starting multi-phase structural work
  - before a build spanning 3+ handoffs
  - "pre-build readiness"
  - "readiness check"
description: "Checkpoint protocol before starting multi-phase structural work"
---

# Pre-Build Readiness Protocol

> **Trigger:** About to start a multi-phase build that touches core infrastructure.
> **Not for:** Single handoffs, doc edits, bug fixes. Those don't need a gate.
> **Who runs it:** CD dispatches to CC. CC executes, CD reviews.

## When to Use

Use this protocol when ALL of these are true:
1. The next work item spans 3+ handoffs
2. It modifies core systems (supervisor, transport, state files, hooks)
3. A Grok review has approved the design
4. Multiple docs were written/modified in the design phase

## Checklist

### 1. Git State Audit
- List all uncommitted changes (staged and unstaged)
- List all untracked files
- Identify which are intentional CD doc writes vs accidental leftovers
- Flag any files that belong in .gitignore

### 2. Smart Commit Grouping
Group outstanding changes into logical commits:
- **Design docs** — one commit per design or review round
- **Methodology changes** — separate from design docs
- **State file updates** — WORK_TRACKER, protocol tracker, etc.
- **Cleanup** — .bak files, stale artifacts, CONTENTS.md updates
- Never mix code and docs in one commit. Never mix design and methodology.

### 3. Test Baseline Verification
- Run full test suite, confirm baseline matches expectations
- Run `jdev verify` if available, confirm clean or document known failures
- Record baseline: total/pass/fail/skip

### 4. WORK_TRACKER Currency
- Verify all completed items are checked off
- Verify the target work item is correctly described and unblocked
- Add the new phase items if not already present

### 5. Doc Status Alignment
- Design doc status matches reality (Draft → Approved if Grok signed off)
- Implementation plan exists and is referenced from WORK_TRACKER
- No orphan docs in research/ or staging/ that should be filed

### 6. Branch Strategy
- Confirm: feature branch or main?
- If feature branch: name it, create it, push it
- If main: confirm no open PRs that could conflict

## Output

CC reports a summary:
```
PRE-BUILD READINESS: [PASS/ISSUES]
- Git: X commits made, Y files committed, working tree clean
- Tests: N pass / M fail (pre-existing)
- WORK_TRACKER: current, target item unblocked
- Docs: aligned, no orphans
- Branch: [branch name or main]
```

## Skip Conditions

Skip this protocol if:
- Working tree is already clean (verified by `git status`)
- Last commit was <1 hour ago and no doc work since
- CD explicitly says `/skip-readiness`
