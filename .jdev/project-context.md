# harvest-gui — Project Context

> Project-specific CC instructions. Combined with shared methodology to produce CLAUDE.md.

---

## CRITICAL: ALWAYS USE UV

**NEVER use bare Python commands. ALWAYS prefix with `uv run`.**

Bad: `python ...` / `pytest ...` / `pip install ...`
Good: `uv run python ...` / `uv run pytest ...` / `uv pip install ...`

This applies to ALL Python execution. **Non-negotiable.**

---

## Project Overview

**harvest-gui** — [add description]

---

## Project Structure

```
harvest-gui/
  .jdev/              # jdev config, agents, state
  docs/               # Documentation
  logs/               # Runtime logs
  tests/              # Test suite
```

---

## Commands

```bash
uv run pytest tests/ -v                  # Run tests
uv run ruff check .                      # Lint
uv run ruff format .                     # Format
uv run mypy . --ignore-missing-imports   # Type check
uv run bandit -r . -c pyproject.toml     # Security scan
```

---

## Style Guidelines

- Type hints on all public functions (modern: `str | None`, `list[str]`)
- Google-style docstrings on public APIs
- Line length: 100 characters (enforced by ruff)

---

## Environment

Requires: Python 3.11+, uv

---
