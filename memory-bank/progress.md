# Progress

| Area | Status |
|------|--------|
| Policy / samples | `docx`, `Attendance.xlsx`, `Book.xlsx` in repo root |
| Planning | `docs/PLAN.md` |
| Memory Bank | Current |
| Backend API | FastAPI: auth, compliance month grid, overrides, Clockify sync, CSV import, xlsx export, digest, Jira variance |
| Frontend | React: login, month grid, day drawer |
| Docker | `docker-compose.yml` + `apps/api/Dockerfile` |
| CI | `.github/workflows/ci.yml` (pytest, web build, Playwright API) |
| Dependabot | `.github/dependabot.yml` |
| E2E | `e2e/` Playwright (api + ui smoke) |
| Tests | `apps/api` pytest (unit + integration), 12+ tests |
| GitHub | Local git + `scripts/create-github-repo-imraxy.sh` (requires `gh` as **imraxy**); Issues used for PM after bootstrap |

## Recently done

- TDD-style tests for rules, CSV import, API flows, Jira helper, xlsx export.
- SQLite StaticPool for threaded TestClient; Postgres path for Docker.

## Next milestone

Production deploy template (managed DB, secrets), optional UI E2E in CI with full stack, deepen Clockify client (projects cache) if needed.
