---
name: handoff-protocol
version: "1.0"
consumer: cc
enforcement: mixed
escape_hatch: none
category: skill
triggers:
  - receiving a handoff
  - reference doc pattern encountered
  - MCP lifecycle step
  - "handoff protocol"
  - "delegation escape hatch"
description: "Full handoff protocol specification for CC task delivery and execution"
---

# Handoff Protocol — Full Specification

Detailed handoff protocol for CC. CLAUDE.md has the essentials; this skill has the complete spec.

## Reference Doc Pattern

HANDOFF.md may contain a `## Reference` section pointing to a detailed planning doc:

```
## Reference
→ `docs/staging/SOME_PLAN.md`
```

When you see this:
1. Read the reference doc FIRST, before starting any work
2. Work through it phase by phase — complete one phase before reading the next
3. The reference doc may cite existing docs or source files — read those on demand
4. Note the reference doc path in STATUS.md

Do NOT work from the HANDOFF.md summary alone when a reference doc is provided. The summary is intentionally compressed — the reference doc has the actual requirements.

Max one indirection level: HANDOFF → reference doc → existing files. Never chain reference docs.

## Scope Tracking Details

HANDOFF.md includes a Scope section:
- **Type:** `count` (N discrete items), `checklist` (named items), `binary` (done/not done)
- **Count:** Expected number of deliverables
- **Target:** One-line success criteria

STATUS.md Completion section must match:
- **Requested:** Number from HANDOFF scope
- **Completed:** Actual items done
- **Remaining:** Requested minus completed
- **Status:** `COMPLETE` | `IN_PROGRESS` | `BLOCKED`

If Completed < Requested with Status: COMPLETE, explain what was skipped and why.

## Delegation Escape Hatch

When HANDOFF.md specifies `## Agent:` or auto-delegation applies, you may skip delegation if:
- You already have full context loaded for the task
- The task is small (< 15 tests, < 3 files)

If you skip delegation, note in STATUS.md why (e.g. "Handled directly — context loaded, 2 files changed").

## Status Page Updates

After completing work that changes feature status or quality metrics, use doc-specialist to surgically update the project status page. Don't regenerate the whole file — targeted edits preserve manual content.

## Journal

The MCP supervisor auto-appends to `.jdev/state/JOURNAL.md` on handoff events. CC does not write to the journal directly.

## MCP Lifecycle Requirements

When the `jdev-coord` MCP server is connected, call MCP tools at each lifecycle step. The MCP DB is the coordination authority — STATUS.md is an optional human-readable mirror:

| Step | MCP Tool Call (REQUIRED) |
|------|--------------------------|
| Receive handoff | `claim_task(task_id)` then `get_context(task_id)` |
| Start working | `update_status(task_id, 'working')` |
| Recitation | `submit_artifact(task_id, 'recitation', content)` — proceed immediately |
| On completion | `complete_task(task_id, artifact_paths)` — requires recitation artifact |

MCP calls are non-fatal — if the MCP server is unavailable, log the failure and continue.

## Health Monitoring Details

After writing STATUS.md with `Status: COMPLETE`:
1. Read `.jdev/state/SNAPSHOT.md`
2. Look for a `## Health` section with threshold warnings
3. If present, append a `## Health` section to STATUS.md with the same warnings
4. If no health section in SNAPSHOT, don't add one to STATUS

This surfaces health drift to CD at the natural review point (`/checkstatus`). Never interrupt work to check health. Never ask about health unprompted. CD decides whether to act.

For deep audit procedures, load the project-health skill.

## Warning Banners

If HANDOFF.md starts with a warning banner (e.g. `⚠ PREVIOUS TASK INCOMPLETE`), the previous handoff was interrupted. CD must resolve this before new work begins. Do not start new work — report the banner in STATUS.md and wait for CD's decision.
