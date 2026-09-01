# Git hooks

## Setup (once per clone)

```bash
git config core.hooksPath .githooks
```

## What it does

`prepare-commit-msg` removes `Co-authored-by: Cursor <cursoragent@cursor.com>` trailers that Cursor IDE/cloud agents inject into commit messages.

Also disable **Cursor Settings → Agents → Attribution** (commit + PR).

## History cleanup

`.githooks/rewrite-history.sh` strips co-author lines from all commits on `dev`, `staging`, and `main` (requires force-push). Run only when instructed.
