# GitHub: repo and issue tracking

## Owner account

The remote repository must live under GitHub user **`imraxy`** (not other accounts that may be logged in on a shared machine).

## Create the remote and seed issues

1. Install and log in as **imraxy**:
   ```bash
   gh auth login -h github.com -u imraxy
   ```
2. From the repo root (after `git commit`):
   ```bash
   chmod +x scripts/create-github-repo-imraxy.sh
   ./scripts/create-github-repo-imraxy.sh
   ```
   Optional custom repo name:
   ```bash
   ./scripts/create-github-repo-imraxy.sh my-repo-name
   ```

The script checks `gh api user` equals `imraxy` before `gh repo create` or `gh issue create`.

## Project management

- Use **Issues** for backlog and delivery tracking (labels: `area:api`, `area:web`, `area:ops`, `area:product`).
- Optional: enable **GitHub Projects** (classic or new) and attach the same repo for a board view.
- Link PRs to issues with `Fixes #123` in the description.

## Default repository URL

After creation: `https://github.com/imraxy/clockify-compliance` (unless you passed a different name to the script).
