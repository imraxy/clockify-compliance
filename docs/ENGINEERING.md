# Engineering standards

## TDD

For new behavior: **write a failing test** → implement the minimum to pass → refactor. Domain logic (rules, import parsers, merge, overlaps) is **test-first**. Hotfixes without tests must add tests in a **follow-up PR immediately**.

## Tests

- **Unit**: fast, no network; pure functions and parsers.
- **Integration**: real Postgres; **mocked** Clockify (no live API in CI).
- **E2E**: critical UI paths against Docker Compose or staging; artifacts on failure.
- **Golden fixtures**: CSV snippets; expected statuses from `Book.xlsx` / `Attendance.xlsx` samples.

## DevOps

- Protected `main`; PR checks: lint, typecheck (if used), unit+integration, build.
- Docker Compose for local dev and CI E2E.
- Secrets in CI/env managers only; **`.env.example`** documents variables.

## Definition of Done

Tests and docs for new env vars in the **same PR**; **CI green**.
