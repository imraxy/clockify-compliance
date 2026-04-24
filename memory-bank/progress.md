# Progress

| Area | Status |
|------|--------|
| Policy / samples | `docx`, `Attendance.xlsx`, `Book.xlsx` in repo root |
| Planning | `docs/PLAN.md` |
| Memory Bank | Current |
| Backend API | FastAPI: auth, compliance month grid, overrides, Clockify sync, CSV import, xlsx export, digest, Jira variance |
| Frontend | React: login, month grid, list/grid toggle, day drawer |
| Docker | `docker-compose.yml` + `apps/api/Dockerfile` |
| CI | `.github/workflows/ci.yml` (pytest, web build, Playwright API) |
| Dependabot | `.github/dependabot.yml` |
| E2E | `e2e/` Playwright (api + ui smoke) |
| Tests | `apps/api` pytest (unit + integration), **26** tests; web Vitest |
| GitHub | `imraxy/clockify-compliance`; **#15–#20** closed (2026-04-24 merges); **#21–#22** open |

## Recently done

- **2026-04-24:** Merged PR #23–#25: dashboard fixes, IST day-boundary compliance build, anomalies for time on leave/holiday/hackathon/week-off; web lockfile pinned for Node 20 `npm ci`.
- TDD-style tests for rules, CSV import, API flows, Jira helper, xlsx export; `test_tz.py` for timezone slicing.
- SQLite StaticPool for threaded TestClient; Postgres path for Docker.

## Next milestone

Production deploy template (managed DB, secrets), optional UI E2E in CI with full stack, deepen Clockify client (projects cache) if needed; close or schedule **#21** / **#22**.
