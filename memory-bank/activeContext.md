# Active context

## Current focus

**Implementation landed:** monorepo with FastAPI backend, React dashboard, Docker Compose, GitHub Actions CI, Playwright API E2E, policy YAML, Clockify sync + CSV import, compliance grid, xlsx export, digest text, Jira variance endpoint (phase-2 helper).

**Recently merged to `main` (2026-04-24):** PR #23 (dashboard GH #17–#19), PR #24 (timezone / day slicing GH #15–#16), PR #25 (leave/holiday/week-off/hackathon hour anomalies GH #20). CI green on merge. **Open GitHub issues:** #21, #22 (not in that batch).

**Repo triage plan implemented (2026-04-27):** completed the remaining critical, high, ops, test/CI, and hygiene items from the repo issue triage plan without editing the plan file. Added overrides GET + tests, Jira phase-2 stub, health/manual-sync UI fixes, timezone-aware model defaults, Excel importer tests/response compatibility, Clockify project-name sync, production config hardening, Alembic bootstrap, CI lint/type/UI E2E gates, ignore rules, and a small `App.tsx` entrypoint split.

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

- Triage **#21** / **#22** (week-off anomalies, leave hours display) if still in scope.
- Log in as **imraxy** and run the GitHub bootstrap script; then enable **branch protection** on `main` + required CI checks.
- Run **`scripts/clockify_smoke_test.py`** with real `CLOCKIFY_API_KEY` / `CLOCKIFY_WORKSPACE_ID`.
- Complete **`docs/CLOCKIFY_FEATURE_MATRIX.md`** after stakeholder audit.
- Configure production **secrets** and managed Postgres.
