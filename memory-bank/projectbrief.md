# Project brief

## Scope

Build a **unified internal web application** that automates Clockify timesheet **compliance and review** (rules from `Clockify_Automation_Rulesets_and_Future_Implementation.docx`), merges **attendance / leave / hackathon** context (`Attendance.xlsx`), and produces **Book-style** monthly status grids (`Book.xlsx` mental model). Optional Excel export; **Jira variance** is phase 2.

## Goals

- Replace manual spreadsheet review with a **single dashboard** (primary UX).
- Ingest time from **Clockify** via **API** (free plan—validate with real key) and/or **CSV export import** into the same normalized model.
- Long-term: optional **native time entry** and **retire Clockify** after parity; alternative path is **OSS** base (e.g. Kimai) if leaving SaaS early.

## Constraints

- **Strict TDD**, **CI/CD**, **unit + E2E** tests (see `memory-bank/techContext.md`).
- No live Clockify calls in automated tests—fixtures/mocks only.
- Secrets never committed; use `.env.example` only.

## Key assets (repo root)

| File | Purpose |
|------|---------|
| `Clockify_Automation_Rulesets_and_Future_Implementation.docx` | Policy source |
| `Attendance.xlsx` | Per-day attendance codes |
| `Book.xlsx` | Per-day review status examples |

## Open decisions

- Path **A** (Clockify-anchored app) vs **B** (OSS fork)—default A until audit complete.
- **6–8 hour** daily band: document before implementing thresholds.
