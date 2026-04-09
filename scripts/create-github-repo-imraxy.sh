#!/usr/bin/env bash
# Create GitHub repo under user imraxy and open initial issues for project management.
# Prerequisites:
#   1) Install GitHub CLI: https://cli.github.com/
#   2) Authenticate AS imraxy (not another account):
#        gh auth logout -h github.com   # if needed
#        gh auth login -h github.com -u imraxy
#   3) Run from repo root with a clean git history ready to push (see README).

set -euo pipefail

REQUIRED_USER="imraxy"
DEFAULT_REPO="clockify-compliance"

REPO_NAME="${1:-$DEFAULT_REPO}"
FULL_NAME="${REQUIRED_USER}/${REPO_NAME}"

login="$(gh api user -q .login 2>/dev/null || true)"
if [[ "$login" != "$REQUIRED_USER" ]]; then
  echo "ERROR: gh must be logged in as GitHub user '${REQUIRED_USER}'."
  echo "Current authenticated user: '${login:-<none/failed>}'."
  echo "Fix: gh auth login -h github.com -u ${REQUIRED_USER}"
  exit 1
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: not a git repository. Run: git init && git add . && git commit -m 'Initial commit'"
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "Remote 'origin' already exists: $(git remote get-url origin)"
else
  echo "Creating private repo ${FULL_NAME} and pushing..."
  gh repo create "${FULL_NAME}" \
    --private \
    --source=. \
    --remote=origin \
    --push \
    --description "Clockify timesheet compliance: FastAPI + React, rules engine, Clockify sync/CSV import"
fi

echo "Creating labels (idempotent)..."
gh label create "area:api" --color "0E8A16" --description "Backend / FastAPI" -R "${FULL_NAME}" 2>/dev/null || true
gh label create "area:web" --color "1D76DB" --description "Frontend / React" -R "${FULL_NAME}" 2>/dev/null || true
gh label create "area:ops" --color "FBCA04" --description "CI, Docker, deploy" -R "${FULL_NAME}" 2>/dev/null || true
gh label create "area:product" --color "D93F0B" --description "Requirements, audit, policy" -R "${FULL_NAME}" 2>/dev/null || true

create_issue() {
  local title="$1"
  local body="$2"
  shift 2
  gh issue create -R "${FULL_NAME}" --title "${title}" --body "${body}" "$@"
}

echo "Creating initial issues (skip if duplicates — close manually if re-run)..."
create_issue "Ops: branch protection + required CI on main" "Enable branch protection on \`main\`, require PR, require status checks from \`.github/workflows/ci.yml\`." --label "area:ops"
create_issue "Product: complete Clockify feature matrix" "Fill \`docs/CLOCKIFY_FEATURE_MATRIX.md\` (Must/Should/Won't) after stakeholder walkthrough." --label "area:product"
create_issue "Integration: Clockify API smoke (free plan)" "Run \`scripts/clockify_smoke_test.py\` with real \`CLOCKIFY_API_KEY\` and \`CLOCKIFY_WORKSPACE_ID\`; document any paid-only gaps." --label "area:api"
create_issue "Infra: production Postgres + secrets + HTTPS" "Managed DB, rotate \`SECRET_KEY\`, Clockify keys in secret manager, deployment runbook." --label "area:ops"
create_issue "Testing: full-stack Playwright E2E in CI" "Start web + API in CI (or Compose) and run UI flows: login, load month, drawer." --label "area:ops"
create_issue "Alerts: Slack/email digest automation" "Automate \`GET /api/v1/compliance/month/digest.txt\` via cron/GitHub Actions → Slack webhook or SMTP. See \`docs/ALERTS.md\`." --label "area:api"
create_issue "UX: day drawer shows time entries + Clockify link" "Replace raw JSON with entry list and deep link to Clockify for edits." --label "area:web"
create_issue "Rules: project misallocation allowlists" "Structured allowlists per team/role before any LLM-based classification." --label "area:api"
create_issue "Phase 2: Jira estimates vs actuals" "Jira REST for estimates; parse issue keys from entry text; surface variance in UI." --label "area:api"
create_issue "Future: native time entry + Clockify cutover" "When parity reached: internal timer/timesheet and migration off Clockify." --label "area:product"

echo "Done. Repo: https://github.com/${FULL_NAME}"
echo "Use GitHub Issues + optional Projects (board) for PM; milestones optional."
