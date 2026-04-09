# Tech context

## Stack (implemented)

- **Backend:** Python 3.12, **FastAPI**, **SQLAlchemy 2**, **PostgreSQL** (Docker) or SQLite (dev/tests via StaticPool).
- **Frontend:** **Vite + React + TypeScript** (`apps/web`).
- **Infra:** `docker-compose.yml`; GitHub Actions in `.github/workflows/ci.yml`; **Playwright** in `e2e/`.

## Engineering requirements (mandatory)

| Area | Expectation |
|------|-------------|
| **TDD** | Failing test → minimal pass → refactor for new behavior |
| **Unit** | Rules, parsers, mappers, dedupe, date/working-day helpers |
| **Integration** | DB repos, jobs with mocked Clockify |
| **E2E** | Playwright/Cypress—login, grid, drill-down, key reviewer flows; seed data |
| **CI** | Every PR: lint, types (if used), unit+integration, build; E2E on main or nightly |
| **CD** | Staging deploy; gated production |

## External references

- [Clockify API docs](https://docs.clockify.me/) — API available on free tier per vendor help; verify endpoints with real key.
- Clockify CSV: Reports → Detailed/Summary export for bootstrap path.

## Repo hygiene

- `.env.example` only in git; branch protection on `main`; Dependabot or equivalent for dependencies.
