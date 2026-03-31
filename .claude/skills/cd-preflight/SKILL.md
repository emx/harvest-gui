---
name: cd-preflight
consumer: cd
enforcement: mechanical
escape_hatch: none
category: protocol
description: "Mandatory preflight section format for CD handoffs — constraint audit, test tier lookup, examples"
---

# CD Preflight Skill

Every handoff must include a `## Preflight` section. This is CD's structured self-audit, mechanically enforced by `jdev dispatch`. The dispatch command refuses to deploy a handoff without a valid preflight.

## Format

```markdown
## Preflight

### User Intent
User's words: [exact quote or close paraphrase]
Delivering: [one sentence summary]
Delta: [none — or state what differs and why]

### Constraint Audit
Target agent: [CC/CA]
Blocked paths: per ACTOR_DENY_PATHS[{agent}] in config.py
Blocked commands: per get_denied_commands("{agent}") in hooks.py
Conflicts: [none — or list each task item that hits a blocked path/command]

### Test Requirements
Files modified: [list each source file]
Touches coordination: [yes/no — mcp_coord/, supervisor, transport, signal dispatch]
Required test tier: [none / unit / chain / closed-loop]
Rationale: [reference the tier table below]
Infrastructure exists: [yes/no — name the harness]
If no: [state what must be built first, or "THIS HANDOFF BUILDS IT"]

### Rules Check
Applicable rules: [quote each from RULES_COMPACT.md]
Violations: [none — or list each]
```

## Test Tier Lookup Table

The required test tier is a lookup, not a judgment call.

| Files touched | Required tier | Why |
|---|---|---|
| Docs only, no source code | `none` | No behavior to test |
| CLI, utilities, non-coordination code | `unit` | Isolated behavior |
| `config.py`, `hooks.py` | `chain` | Static configuration |
| State machine (`mcp_coord/gates.py`, `tools.py`, `models.py`) | `chain` | Multi-step transitions |
| `mcp_coord/supervisor.py`, `mcp_coord/mcp_transport.py` | `closed-loop` | Feedback epicenter |
| Any `mcp_coord/` touching signals, events, dispatch | `closed-loop` | Output becomes input |
| Mix of tiers | Highest applies | Only as safe as riskiest component |

## User Override

The user may explicitly lower the required tier:

```
Required test tier: closed-loop
User override: "quick fix, unit tests fine for now"
Applied tier: unit
```

The override is visible. The gap is documented. The dispatch gate allows it.

## Validation Gates

`jdev dispatch` enforces 5 gates in order:

1. **Section exists** — abort if `## Preflight` missing
2. **All 4 subsections present** — abort naming the missing subsection
3. **No CONFLICT markers** in Constraint Audit — abort if unresolved
4. **Coordination files need closed-loop tier** — abort if `mcp_coord/`/`supervisor`/`transport` in Test Requirements without `closed-loop` tier (unless User override present)
5. **Closed-loop infra check** — abort if tier is `closed-loop` and `Infrastructure exists: no` without `THIS HANDOFF BUILDS IT`

## Examples

### Docs-only handoff

```markdown
## Preflight

### User Intent
User's words: "Update the README"
Delivering: README updates for new CLI commands
Delta: none

### Constraint Audit
Target agent: CC
Blocked paths: per ACTOR_DENY_PATHS[cc]
Blocked commands: per get_denied_commands("cc")
Conflicts: none

### Test Requirements
Files modified: README.md, docs/reference/cli.md
Touches coordination: no
Required test tier: none
Rationale: docs only, no source code
Infrastructure exists: n/a

### Rules Check
Applicable rules: "LLM-friendly docs"
Violations: none
```

### Coordination change

```markdown
## Preflight

### User Intent
User's words: "Fix the supervisor feedback loop"
Delivering: Signal deduplication in supervisor dispatch
Delta: none

### Constraint Audit
Target agent: CC
Blocked paths: per ACTOR_DENY_PATHS[cc]
Blocked commands: per get_denied_commands("cc")
Conflicts: none — writes to mcp_coord/supervisor.py, tests/ (allowed)

### Test Requirements
Files modified: jdev/mcp_coord/supervisor.py, tests/mcp_coord/test_closed_loop.py
Touches coordination: yes
Required test tier: closed-loop
Rationale: supervisor.py is feedback epicenter
Infrastructure exists: yes — LoopbackTransport in mcp_transport.py

### Rules Check
Applicable rules: "Always uv run", "No hardcoded Status strings"
Violations: none
```

## Design Reference

Full rationale: `docs/evolution/design/draft/56-CD_PREFLIGHT_ENFORCEMENT.md`
