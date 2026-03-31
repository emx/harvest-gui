---
name: python-standards
version: "1.0"
consumer: cc
enforcement: mixed
escape_hatch: none
category: skill
triggers:
  - writing or reviewing Python code
  - implementing a new Python module
  - "python standards"
  - "python engineering"
  - "docstrings"
description: "Python-specific engineering standards for jdev-managed projects"
---

# Python Engineering Standards

Python-specific standards for jdev-managed projects. Supplements the language-agnostic `software-standards` skill.

## Package Management

**Always use `uv run`** for all Python commands. Never bare `python`, `python3`, `pip`, or `pytest`. This ensures the correct virtual environment and dependencies are used.

```
uv run pytest tests/ -v
uv run python scripts/myscript.py
uv pip install -e .
```

**Never `pip install` without `--break-system-packages`** if outside a venv. Prefer `uv pip install` which handles this automatically.

## Type Hints

**All public functions must have type annotations.** Enforce with `disallow_untyped_defs = true` in mypy config. Tests and scripts may be excluded.

**Use modern syntax:**
- `list[str]` not `List[str]`
- `dict[str, Any]` not `Dict[str, Any]`
- `str | None` not `Optional[str]`
- `tuple[int, ...]` not `Tuple[int, ...]`

**Avoid circular imports with TYPE_CHECKING:**
```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from mypackage.module import SomeClass
```

## Async Safety

**Use `asyncio.Lock`, never `threading.Lock` in async code.** `threading.Lock` blocks the event loop and causes deadlocks when combined with `await`.

```python
# CORRECT
lock = asyncio.Lock()
async with lock:
    await some_operation()

# WRONG — deadlock risk
lock = threading.Lock()
with lock:
    await some_operation()
```

**Wrap sync code with `run_in_executor`.** Blocking I/O in async functions starves the event loop.

```python
loop = asyncio.get_event_loop()
result = await loop.run_in_executor(None, sync_blocking_function)
```

**Handle fire-and-forget task errors.** `asyncio.create_task()` without error handling silently drops exceptions. Either await the task, add a callback, or wrap in try/except within the coroutine.

**No `time.sleep()` in async code.** Use `asyncio.sleep()`.

**Async context managers for async resources.** Use `async with` for connections, locks, sessions — never the sync `with` equivalent.

## TDD Workflow

**Write the test first.** The cycle: write a failing test → implement the minimum code to pass → refactor → repeat. Tests are not an afterthought — they drive the design.

**Every bug gets a regression test.** Before fixing a bug, write a test that reproduces it. The fix is verified when the test goes green. The test stays forever.

**Test naming:** `test_<component>_<scenario>_<expected>` — readable as a sentence. Group related tests in classes: `TestPatternMatcherInitialization`, `TestPatternMatcherMatches`.

**Fixture hygiene:** Reset state between tests. No test should depend on another test's side effects. Use `autouse` fixtures for singleton/global state cleanup.

**Mock at boundaries, not internals.** Mock external services (APIs, databases, filesystems), not internal functions. Internal mocks make tests brittle and coupled to implementation.

## Pytest Patterns

**Async test configuration:**
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
```

**Marker discipline:** Define custom markers in `pyproject.toml` and use them consistently. Common markers: `slow`, `integration`, `real_api`. Run fast tests by default, slow tests in CI.

**Fixture scoping:** Default to `function` scope. Use `session` or `module` scope only for expensive setup (database connections, server startup) — and document why.

**Subprocess mocking:** Mock `subprocess.run` at the call site, not globally. Verify the command list, not just that subprocess was called. Check that error paths handle non-zero return codes.

```python
@patch("mypackage.module.subprocess.run")
def test_command_failure(mock_run):
    mock_run.return_value = CompletedProcess(args=["cmd"], returncode=1, stderr="error")
    result = my_function()
    assert result.success is False
```

**Coverage caching:** Add a `pytest_sessionfinish` hook in `conftest.py` that writes coverage percentage to `.jdev/state/coverage.json` for the health threshold system.

## Docstrings

**Google style, mandatory on public APIs:**
```python
def create_item(name: str, count: int = 1) -> Item:
    """Create a new item.

    Args:
        name: Display name for the item.
        count: Initial quantity.

    Returns:
        The created Item instance.

    Raises:
        ValueError: If name is empty.
    """
```

Required sections: summary, Args, Returns. Add Raises if applicable. Add Example for complex interfaces.

## Exception Hierarchy

**Define a base exception per package.** Callers can catch broad (`SkillError`) or narrow (`SkillParseError`).

```python
class AppError(Exception):
    """Base exception for the application."""

class ConfigError(AppError):
    """Configuration-related errors."""

class ParseError(AppError):
    """Input parsing errors."""
```
