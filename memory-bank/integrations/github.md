# GitHub integration

## Intended remote

- **Owner:** `imraxy` (required; script refuses other `gh` identities).
- **Default repo name:** `clockify-compliance` → `https://github.com/imraxy/clockify-compliance`

## Project management

- **Issues** are the primary PM surface; bootstrap script creates labels (`area:*`) and initial backlog items from the product plan.
- Optional **GitHub Projects** board can be added in the UI.

## Local automation

- Script: [`scripts/create-github-repo-imraxy.sh`](../../scripts/create-github-repo-imraxy.sh)
- Docs: [`docs/GITHUB.md`](../../docs/GITHUB.md)

## Auth note

If `gh auth status` shows another user or an invalid token, run `gh auth login -h github.com -u imraxy` before the script.
