# Pre-implementation readiness checklist

Status after repository bootstrap (**automated items** satisfied in-repo; **manual** items need your sign-off).

## Product / data

| Item | Status | Notes |
|------|--------|--------|
| Clockify feature matrix | **Template** | [`CLOCKIFY_FEATURE_MATRIX.md`](CLOCKIFY_FEATURE_MATRIX.md) — fill Must/Should/Won’t |
| Path A vs B | **Recorded** | [`PLATFORM.md`](PLATFORM.md) — default **Path A** (Clockify-anchored) |
| 6–8 hour rule + status enum | **Documented** | [`config/thresholds.yaml`](../config/thresholds.yaml) |
| Attendance format + mapping | **Documented** | [`config/attendance_mapping.yaml`](../config/attendance_mapping.yaml) |
| Holiday / hackathon ownership | **Configurable** | `company_calendar` table + seed; YAML in `config/` |
| Free-plan API or CSV spec | **Script + doc** | [`scripts/clockify_smoke_test.py`](../scripts/clockify_smoke_test.py); run with real key |

## Engineering

| Item | Status | Notes |
|------|--------|--------|
| Repo structure + stack | **Done** | `apps/api` (FastAPI), `apps/web` (Vite React), `e2e` (Playwright) |
| Docker Compose | **Done** | Root `docker-compose.yml` |
| CI skeleton | **Done** | `.github/workflows/ci.yml` |
| E2E smoke | **Done** | `e2e/tests/smoke.spec.ts` |
| Branch protection | **Manual** | Enable in GitHub: require PR + CI on `main` |
| Secrets documented | **Done** | `apps/api/.env.example` |

**Sign-off:** Product owner confirms manual rows + branch protection before production deploy.
