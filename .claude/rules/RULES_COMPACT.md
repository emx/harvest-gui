# Rules (Compact)

Compacted from full rule files. Load `hardcoding-prevention` skill for details.

- No hardcoded Status strings — use `Status.X.value` (prevents silent enum drift)
- Exceptions: status.py definitions, comments/docstrings, _DISPLAY_MAP, dispatch dict keys
- Always `uv run` — no bare python/pip/pytest (enforced: hook + PATH wrapper)
- Never delete files — move to ~/projects/_trash/ (enforced: convention)
- GNU syntax only — no BSD variants (enforced: Homebrew PATH in tmux)
- LLM-friendly docs — headers, tables, cross-refs by path, frontmatter
- Never edit CLAUDE.md — edit .jdev/project-context.md instead
- Forbidden: `rm -rf /`, `git push --force`, `jdev stop` (enforced: hook)
- No secrets in VCS, no shell=True with user input, no sensitive data in logs
