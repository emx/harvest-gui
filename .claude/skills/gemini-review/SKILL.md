---
name: gemini-review
version: 1
consumer: cd, ca
tags: [review, quality, gemini]
triggers:
  - design doc ready for external review
  - investigation report needs validation
  - any artifact that must be reviewed before implementation
  - "gemini review"
  - "external review"
  - "send to gemini"
description: End-to-end Gemini external review cycle — prepare, invoke, triage, gate
---

# Gemini Review Skill

> **Consumer:** CD (orchestrator), CA (architect)
> **Purpose:** Run structured external reviews through the `jdev gemini-review` pipeline.
> **Process authority:** `methodology/processes/GROK_REVIEW_PROCESS.md` (shared across providers)
> **Prompt template:** `methodology/templates/GROK_REVIEW_PROMPT_TEMPLATE.md` (provider-agnostic)

---

## Overview

Gemini reviews use the `jdev gemini-review` CLI command, which calls the Google Gemini API via the `google-genai` SDK, parses the response, writes output files, and logs to JOURNAL.md.

**Key differences from Grok:**
- **Thinking extraction** — Gemini supports `ThinkingConfig` with levels. Thought parts are extracted and stored in `ReviewResponse.thinking` for richer triage context.
- **1M token context window** — larger artifacts can be sent without symbol extraction. Full file attachments are practical for most codebases.
- **Environment variable:** `GEMINI_API_KEY` (not `XAI_API_KEY`)
- **Default model:** `gemini-2.5-pro` (override via `GEMINI_MODEL` env var or `--model` flag)

**Who runs the command:**
- **CD** runs `uv run jdev gemini-review` directly (CD has shell access via Claude Code). CD can handle the full review cycle: prepare prompt, dry-run, invoke, triage.
- **CA** has shell access and runs `jdev gemini-review` directly via `uv run jdev gemini-review`. CA handles the full cycle: prepare prompt, dry-run, invoke, triage.

---

## Two Modes

### Auto-Generated Mode

For straightforward reviews where the standard template works. CD provides the artifact path, questions, and optional constraints. The pipeline wraps them in a standard prompt.

```bash
jdev gemini-review <artifact-path> \
  -q "question 1,question 2,question 3" \
  -c "constraint 1,constraint 2" \
  -o docs/research/<topic>
```

**When to use:** Simple design reviews with ≤5 short questions. No attachments needed beyond the artifact itself.

### Custom Prompt Mode

For complex reviews where CD needs full control over the prompt: multi-section questions, architectural context, scenario matrices, code attachments.

```bash
jdev gemini-review \
  --prompt <prompt-file> \
  --attach <file1> \
  --attach <file2>:func1,func2 \
  -o docs/research/<topic>
```

**When to use:** Most reviews. The custom prompt gives CD full control over framing, context, and question structure.

**Custom mode is the default recommendation.** The extra 10 minutes writing a proper prompt file pays back in review quality.

---

## The Cycle

The review cycle is identical to Grok reviews. See `grok-review` skill for the full cycle specification:

```
PREPARE → DRY RUN → INVOKE → TRIAGE → (REVISE → INVOKE)* → GATE
```

Maximum 3 rounds. Zero Real findings after any triage → skip to gate.

All stages (PREPARE, DRY RUN, INVOKE, TRIAGE, REVISE, GATE) follow the same methodology as the grok-review skill. The prompt template, triage classification system, anti-patterns, and rules all apply unchanged.

---

## Quick Reference: Command Templates

### R1 Custom Review (most common)
```bash
# Dry run first
jdev gemini-review \
  --prompt docs/research/<topic>/GEMINI_<TOPIC>_REVIEW_PROMPT.md \
  --attach jdev/reactors/handoff.py \
  --attach jdev/status.py:Status,_HANDOFF_ALLOWED \
  -o docs/research/<topic> \
  --dry-run

# Then for real
jdev gemini-review \
  --prompt docs/research/<topic>/GEMINI_<TOPIC>_REVIEW_PROMPT.md \
  --attach jdev/reactors/handoff.py \
  --attach jdev/status.py:Status,_HANDOFF_ALLOWED \
  -o docs/research/<topic>
```

### R1 Auto-Generated (simple reviews)
```bash
jdev gemini-review docs/evolution/design/draft/SOME_DESIGN.md \
  -q "Is the state model sound?,What failure modes exist?,What's missing?" \
  -c "File-based coordination is settled,Polling architecture not up for redesign" \
  -o docs/research/<topic>
```

### Pre-flight Check
```bash
jdev gemini-ping     # Verify API connectivity
jdev gemini-models   # List available models
```

---

## File Naming Convention

| File | Pattern |
|------|---------|
| CD's prompt (source) | `GEMINI_<TOPIC>_REVIEW_PROMPT.md` |
| Assembled prompt R1 | `GEMINI_<TOPIC>_REVIEW_PROMPT_R1.md` |
| Response R1 | `GEMINI_<TOPIC>_REVIEW_RESPONSE_R1.md` |
| Assembled prompt R2 | `GEMINI_<TOPIC>_REVIEW_PROMPT_R2.md` |
| Response R2 | `GEMINI_<TOPIC>_REVIEW_RESPONSE_R2.md` |

The pipeline auto-generates filenames. CD only writes the source prompt file.

---

## Gemini-Specific Notes

### Thinking Extraction

When Gemini processes a review, its internal reasoning (thinking parts) are extracted and stored separately from the response content. This provides:
- **Triage context** — see how the reviewer reasoned about each finding
- **Calibration** — identify when findings stem from misunderstanding vs. genuine gaps
- **Token budget visibility** — thinking tokens are logged separately in usage output

### Model Selection

- Default: `gemini-2.5-pro` (configurable via `GEMINI_MODEL` env var)
- Override per-review: `--model gemini-2.5-flash` (faster, lower cost)
- List available: `jdev gemini-models`

### Context Window

Gemini's 1M token context window means:
- Full file attachments are practical for most files (no need for symbol extraction under ~50K lines)
- Multiple large attachments can be included simultaneously
- The entire codebase context can be provided for architectural reviews

Symbol extraction (`--attach file.py:func1,func2`) is still useful for focusing the reviewer's attention, even when context limits are not a concern.

---

## Rules

All rules from the grok-review skill apply unchanged:
1. Review before build
2. One review at a time
3. Abort is always available
4. Dry-run first
5. Custom prompt for anything non-trivial
6. Read the template
7. Triage decides, not the reviewer
8. Operational validation is mandatory
9. Red-flag words block on the critical path
