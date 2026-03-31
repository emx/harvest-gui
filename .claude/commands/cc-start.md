---
description: CC implementer startup dashboard — shows status, pending handoff, git state
---

Read the following files and present a concise startup dashboard:

1. `.jdev/state/STATUS.md` — show current status line
2. `.jdev/state/HANDOFF.md` — show title if a handoff is pending, or "No pending handoff"
3. Run `git status --short` — show working tree state
4. Run `git log --oneline -3` — show last 3 commits

Present as a compact dashboard:

## CC Ready

**Status:** [status from STATUS.md]
**Pending:** [handoff title or "none"]
**Branch:** [current branch]
**Recent commits:**
- [commit 1]
- [commit 2]
- [commit 3]
**Working tree:** [clean / N files modified]

Awaiting `/handoff` command.
