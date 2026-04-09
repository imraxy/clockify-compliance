# Active context

## Current focus

**Implementation landed:** monorepo with FastAPI backend, React dashboard, Docker Compose, GitHub Actions CI, Playwright API E2E, policy YAML, Clockify sync + CSV import, compliance grid, xlsx export, digest text, Jira variance endpoint (phase-2 helper).

## Where things live

- Backend: `apps/api` — `uvicorn app.main:app`
- Frontend: `apps/web` — `npm run dev`
- Plan (read-only source of truth in Cursor): sync to `docs/PLAN.md` when updated
- Runbook: root `README.md`

## GitHub

- Remote is **not created automatically** until you authenticate `gh` as **`imraxy`** (see [`docs/GITHUB.md`](../docs/GITHUB.md)).
- Run `./scripts/create-github-repo-imraxy.sh` to create `imraxy/clockify-compliance`, push `origin`, and seed **Issues** + labels for PM.
- Details: [`memory-bank/integrations/github.md`](integrations/github.md).

## Next steps (operational)

- Log in as **imraxy** and run the GitHub bootstrap script; then enable **branch protection** on `main` + required CI checks.
- Run **`scripts/clockify_smoke_test.py`** with real `CLOCKIFY_API_KEY` / `CLOCKIFY_WORKSPACE_ID`.
- Complete **`docs/CLOCKIFY_FEATURE_MATRIX.md`** after stakeholder audit.
- Configure production **secrets** and managed Postgres.
