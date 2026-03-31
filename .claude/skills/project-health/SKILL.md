---
name: project-health
version: "1.0"
consumer: cd
enforcement: advisory
escape_hatch: none
category: skill
triggers:
  - health thresholds crossed
  - after major refactor or multi-session work plan
  - deep audit requested
  - "project health"
  - "health audit"
  - "deep audit"
description: "Project health audit checklist and diagnostic procedures"
---

# Project Health

Periodic project health monitoring and deep audit procedures for jdev-managed projects.

## How It Works

Two layers: **continuous detection** (automatic) and **deep audit** (manual, triggered by recommendations).

### Continuous Detection

The project snapshot (generated on `jdev start` and before each handoff) checks health thresholds. When thresholds are crossed, CC appends a Health section to STATUS.md after completing a handoff:

```
## Health
- ⚠ Coverage at 58% (threshold: 60%)
- ⚠ 3 modules with zero tests
- Recommend: deep audit
```

CD sees this during `/checkstatus` and decides whether to act.

**CC rules:**
- Append health notes to STATUS.md only after `Status: COMPLETE` — never interrupt work in progress.
- One-line per issue. No explanations — just the metric and threshold.
- Include "Recommend: deep audit" only when 2+ thresholds are crossed or a single critical threshold is crossed.
- If no thresholds are crossed, don't add the Health section at all.

### Deep Audit

Triggered by the user after seeing health recommendations (or at their own judgment after major work). Follows the 4-phase procedure below. Typically takes 1 session.

---

## Thresholds

Default thresholds. Projects can override in `project.yaml` under a `health:` key.

| Metric | Threshold | How to measure |
|--------|-----------|----------------|
| Test coverage | < 60% | `pytest --cov` or equivalent (cached result) |
| Modules with zero tests | > 0 critical modules | Cross-reference source files with test files |
| Cyclomatic complexity | Any function > 15 | `radon cc -n C` or language equivalent |
| Cognitive complexity | Any function > 20 | Language-specific tooling |
| Code duplication | Any block > 20 lines duplicated | `jscpd` or manual review |
| TODO/FIXME count | > 20 across codebase | grep in source dirs only |
| Dead import/function count | > 0 | Linter unused detection |
| Test suite runtime | > 2x previous baseline | Compare with cached timing |

Critical thresholds (single crossing triggers recommendation):
- Coverage below 50%
- Any module with zero tests that has subprocess calls, file I/O, or external APIs

---

## Deep Audit Procedure

### Phase 1: Measure

Quantitative, automated. Produces numbers before any changes.

**1.1 Test coverage report**
- Run coverage with per-file breakdown, sorted by lowest coverage first
- Flag modules below project threshold
- Flag coverage regressions vs last audit (compare with cached `.jdev/state/coverage.json`)
- Identify untested critical paths (subprocess management, file I/O, error handling branches)

**1.2 Code complexity**
- Cyclomatic complexity per function — flag anything above threshold
- Cognitive complexity — flag deeply nested or hard-to-follow functions
- File length — flag files above 500 lines (candidate for splitting)
- Function length — flag functions above 50 lines

**1.3 Code duplication**
- Detect duplicate or near-duplicate code blocks across modules
- Flag functions that do the same thing with slightly different implementations
- Note: some duplication is acceptable (test fixtures, boilerplate). Use judgment.

**1.4 Baseline capture**
- Record all metrics to `.jdev/state/health-baseline.json` for future comparison
- Include: timestamp, coverage %, complexity outliers, test count, TODO count

### Phase 2: Clean

Removal and cleanup. Low-risk changes — removing things, not adding.

**2.1 Dead code and stale artifacts**
- Unused functions, imports, classes (verify with grep before removing)
- Unreachable branches, commented-out code blocks
- Orphaned test fixtures and helpers
- Stale TODO/FIXME comments referencing completed work
- Staging docs for completed features
- Temp files, build artifacts, cache files that shouldn't be tracked

**2.2 Dependency hygiene**
- Unused dependencies in project manifest (pyproject.toml, package.json, etc.)
- Missing type stubs or dev dependencies that cause CI failures but work locally
- Pinned versions that are significantly outdated
- Dependencies that are declared but imported only in dead code

**2.3 Git and infrastructure hygiene**
- Untracked files that should be gitignored
- Stale branches (merged but not deleted)
- Tag/version consistency — do tags match released versions?
- CI pipeline end-to-end verification — push and confirm all checks pass
- Pre-commit hooks — are they current? Do they match CI checks?

### Phase 3: Verify

Correctness checks. Catches real bugs.

**3.1 Code review**
- Inconsistent patterns across modules (one module does X this way, another that way)
- Error handling gaps — bare except, silent swallowing, missing exc_info
- Subprocess safety — shell=True, missing returncode checks, injection risks, missing timeouts
- Duplicate utility functions (same logic implemented in multiple places)
- Logic bugs in parsing/validation (e.g. wrong defaults, off-by-one, silent fallthrough)
- Type annotation gaps in public functions

**3.2 Configuration integrity**
- Hardcoded values that belong in config
- Inline env var parsing that should be centralized
- Stale config references (config files pointing to old paths, renamed modules, removed features)
- Config corruption handling — what happens with malformed config?

**3.3 Documentation integrity**
- Cross-reference accuracy — do docs reference files/paths that still exist?
- Content accuracy — does documentation match current code behavior?
- Structural consistency — does the doc hierarchy follow project conventions?
- Completeness — are new features documented? Are removed features still documented?
- Index/README links — do they point to valid targets?
- Stale design docs — drafts that are now implemented, approved docs that are now superseded

**3.4 Error message audit**
- After refactoring, do error messages reference correct paths and commands?
- Are error messages actionable — does the user know what to do next?
- Do error messages match the actual error condition?

### Phase 4: Assess

Qualitative checks requiring judgment. Not everything here produces a fix.

**4.1 Log auditability**
- Pick a common failure scenario (missing config, process crash, network timeout)
- Try to diagnose it from logs alone
- Are there enough breadcrumbs? Can you trace the sequence of events?
- If not — add strategic log points (don't over-log, add what's missing)

**4.2 Performance sanity check**
- Test suite runtime — did it regress significantly?
- CLI startup time — noticeable delay?
- Any operation that hangs or takes unexpectedly long?
- Not a full performance audit — just catch obvious regressions

**4.3 Security surface**
- String interpolation into shell commands without escaping
- `shell=True` with user-influenced or config-derived input
- Secrets or tokens in code, config, or logs
- File permissions on sensitive state files

**4.4 Health report**
- Produce a summary: what was found, what was fixed, what's deferred
- Update `.jdev/state/health-baseline.json` with new metrics
- Update project status page if metrics changed significantly
- Note items deferred for future sessions

---

## Output

The deep audit produces:
1. **Health baseline** — `.jdev/state/health-baseline.json` (metrics for future comparison)
2. **Audit findings** — reported in STATUS.md or a dedicated audit doc
3. **Commits** — fixes made during Phase 2-3
4. **Deferred items** — logged for future sessions, not forgotten

---

## When to Run

The deep audit is never mandatory. It's recommended when:
- Health thresholds are crossed (CC flags this in STATUS.md)
- A multi-session work plan has just been completed
- A major refactor touched 5+ files
- Before a version you consider "stable"
- It's been more than 4 weeks since the last audit

The user always decides. CC recommends, never forces.
