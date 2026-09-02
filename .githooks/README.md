# Git hooks

## Setup (once per clone)

```bash
git config core.hooksPath .githooks
```

## What it does

`prepare-commit-msg` removes Cursor co-author trailers (any casing), e.g. `Co-authored-by: Cursor <cursoragent@cursor.com>`.

Agents must commit with:

```bash
git -c core.hooksPath=.githooks commit -m "message"
```

Also disable **Cursor Settings → Agents → Attribution** (commit + PR).

## History cleanup

`.githooks/rewrite-history.sh` strips co-author lines from all commits on `dev`, `staging`, and `main` (requires force-push). Run only when instructed.
