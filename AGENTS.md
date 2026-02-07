# AGENTS.md — Project Operating Rules

## Mission
Build and maintain a polished, shippable software project in this repository.

## Non-negotiables
- Always keep the repo runnable: do not leave it in a broken state.
- Prefer small commits and frequent verification loops (run tests/build often).
- No secrets: never add API keys or require private credentials.
- Default to offline-friendly behavior (no runtime network dependency unless explicitly asked).
- Keep the codebase understandable: consistent structure, naming, and docs.

## Engineering Quality Bar
- Provide a single, repeatable “how to run” path in README.
- Add automated checks (tests at minimum; lint/format if feasible).
- If you introduce a dependency, justify it briefly in README.

## Delivery Definition
Done means:
- Clean install + run path exists (documented).
- Core functionality is implemented and demonstrable.
- Tests (at least unit tests for core logic) pass.
- Major UX loops have been exercised and obvious bugs fixed.

## Output Style
- In chat, minimize preambles. Focus on actions taken, commands run, results, and next concrete step.
- If blocked, state exactly what is missing and how to resolve it.
