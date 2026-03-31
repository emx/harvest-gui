---
name: software-standards
version: "1.0"
consumer: cc
enforcement: mixed
escape_hatch: none
category: skill
triggers:
  - writing or reviewing code
  - implementing a new feature
  - "software standards"
  - "engineering standards"
  - "code quality"
description: "Language-agnostic software engineering standards and practices"
---

# Software Engineering Standards

Language-agnostic engineering principles for all jdev-managed projects. These are standards, not implementation details — each project implements them in its own language and framework.

## Unified Logging

**Two-axis model:** verbose (user-facing detail level) and debug (diagnostic depth). These are independent — verbose controls what the user sees, debug controls what goes to log files.

**Single entry point:** One `configure_logging()` function sets up all handlers. No competing log systems. No module-level logging configuration.

**Module loggers:** Every module uses `logger = logging.getLogger(__name__)` (or language equivalent). No global logger instances shared across modules.

**File handlers:** Rotating file handlers for persistent logs. Two log files: standard (INFO+) and debug (DEBUG+, opt-in). Debug log only created when explicitly enabled.

**No bare print for status/errors:** All status output goes through the output module. All diagnostic output goes through the logger. Raw print/console.log/fmt.Println is reserved for intentional data output only.

## Output Discipline

**Two channels, strict separation:**
- **Output module** (`info`, `success`, `error`, `warn`): User-facing messages. Goes to stderr with formatting. These are what the user sees during normal operation.
- **Logger** (`logger.info`, `logger.debug`, `logger.error`): Diagnostic messages. Goes to log files. These are for debugging and post-mortem analysis.

**Never mix channels.** A message is either user-facing (output module) or diagnostic (logger), never both. If you need both, call both explicitly.

**Data output is intentional.** When a command's purpose is to display data (e.g. `status`, `list`), raw print to stdout is acceptable. Document this as intentional in the function.

## Config Centralization

**Central path dataclass:** All derived paths come from a single dataclass (e.g. `ProjectPaths`). No hardcoded path strings scattered across modules. `project_dir / ".config" / "state" / "file.md"` appears once in the dataclass, never in business logic.

**Tool discovery:** External tool paths resolved once at setup, cached in config. Modules consume resolved paths, never call `which`/`shutil.which` inline.

**Environment variables as overrides:** Config files hold defaults. Environment variables override for CI, debugging, or special contexts. Never parse env vars inline in business logic — centralize in a settings loader.

**Corruption handling:** Config loading never crashes. Missing or corrupt config → log warning, use sensible defaults, continue. Never silently return empty/wrong data.

## Error Handling

**No bare `except:`** — always catch specific exception types. The only acceptable bare except is at process-level entry points (main functions) as a last-resort crash handler that logs before exiting.

**Log before swallowing.** If you catch an exception and don't re-raise, log it with `exc_info=True` (or language equivalent) for traceback capture. Silent swallowing makes debugging impossible.

**No false-positive success.** When calling subprocesses, check return codes. `subprocess.run()` with `check=False` must explicitly handle the failure case. A function that calls a subprocess and doesn't check the result is a bug.

**No leaked file handles.** Use context managers (`with` statements) for all file operations. Never `f = open(...)` without a corresponding close in a finally block.

**Specific exception types.** Catch the narrowest exception that makes sense. `except ValueError` not `except Exception`. Broad catches hide bugs.

## Exception Propagation

**Commands return exit codes.** CLI entry points return 0/1 (or richer codes). They catch exceptions and translate to user-facing error messages + exit codes. They never let exceptions propagate to the user as tracebacks.

**Library code raises exceptions.** Internal modules raise specific exceptions. They don't catch-and-return-None for errors — that hides failures. Let the caller decide how to handle it.

**Background processes log errors.** Daemons and background services catch exceptions at the event loop level, log them, and continue. They don't crash on transient errors. They do crash on configuration errors that can't be recovered.

**Graceful degradation over silent failure.** When a non-critical operation fails (cosmetics, notifications, optional features), log a warning and continue. Never silently skip. The user should be able to find out why something didn't work by checking logs.

## Subprocess Discipline

**Always check return codes** or use the language's equivalent of `check=True`. Every subprocess call must have explicit success/failure handling.

**Log command + exit code on failure.** When a subprocess fails, log what was run and what it returned. Don't just log "operation failed" — include the command and exit code.

**No shell=True without justification.** Shell invocation introduces injection risk and platform-dependent behavior. Use list-based commands. If shell features are needed (pipes, globbing), document why.

**Timeout everything.** External processes can hang. Set timeouts on all subprocess calls. Handle `TimeoutExpired` explicitly.

**Quote arguments.** When shell=True is unavoidable, use `shlex.quote()` (or equivalent) on all interpolated values.

## Security Principles

**Information disclosure.** Error responses must not reveal whether a resource exists. "Not found" and "unauthorized" should return the same message. Don't leak internal state through error details.

**Validate and sanitize all user input.** Never pass user-provided strings directly into shell commands, SQL queries, file paths, or template engines without validation and escaping. Assume all input is hostile.

**No secrets in version control.** API keys, tokens, passwords go in environment variables or secret managers. Never hardcode, never commit. Use `.env` files locally (gitignored), env vars in CI.

**Minimal error exposure.** Log full tracebacks to diagnostic logs. Show users only what they need: a clear error message and what to do next. Never expose stack traces, internal paths, or system details in user-facing output.
