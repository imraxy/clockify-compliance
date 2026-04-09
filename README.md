# Clockify timesheet compliance automation

Internal project to automate timesheet validation against Clockify, attendance data, and Book-style review grids.

## Quick start (Docker)

```bash
docker compose up -d --build postgres api
# API: http://localhost:8000/health
# Seed logins: admin@example.com / admin123, reviewer@example.com / reviewer123, employee@example.com / employee123
docker compose up web   # optional UI on http://localhost:5173
```

## Local development

- **API:** `cd apps/api && pip install -r requirements.txt && uvicorn app.main:app --reload` (set `DATABASE_URL`, `CONFIG_DIR`, `SECRET_KEY`; copy `apps/api/.env.example`).
- **Web:** `cd apps/web && npm install && npm run dev`
- **Tests:** `cd apps/api && pytest`
- **E2E (API smoke):** with API running, `cd e2e && npm install && npx playwright install chromium && API_URL=http://127.0.0.1:8000 npx playwright test --project=api`
- **Clockify smoke:** `CLOCKIFY_API_KEY=... CLOCKIFY_WORKSPACE_ID=... python scripts/clockify_smoke_test.py`

## GitHub (owner: imraxy)

Create the remote and seed **Issues** for project management:

```bash
gh auth login -h github.com -u imraxy
./scripts/create-github-repo-imraxy.sh
```

Details: [`docs/GITHUB.md`](docs/GITHUB.md).

## Repo map

| Path | Purpose |
|------|---------|
| `apps/api` | FastAPI backend, rules engine, Clockify sync, CSV import, xlsx export, Jira variance helper |
| `apps/web` | Vite + React dashboard (login, month grid, day drawer) |
| `e2e` | Playwright tests |
| `config/` | `thresholds.yaml`, `attendance_mapping.yaml` |

- **Living context:** [`memory-bank/`](memory-bank/)
- **Docs:** [`docs/README.md`](docs/README.md) — includes **[`docs/PLAN.md`](docs/PLAN.md)** (do not edit plan in Cursor plans without syncing)
- **Samples:** `Attendance.xlsx`, `Book.xlsx`, `Clockify_Automation_Rulesets_and_Future_Implementation.docx`

Cursor agents: see [`.cursorrules`](.cursorrules).
