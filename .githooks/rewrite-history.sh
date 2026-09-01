#!/bin/bash
set -euo pipefail
export FILTER_BRANCH_SQUELCH_WARNING=1
cd "$(dirname "$0")/.."

for branch in dev staging main; do
  echo "=== Rewriting $branch ==="
  git checkout -B "$branch" "origin/$branch"
  git filter-branch -f --msg-filter "grep -Fv 'Co-authored-by: Cursor <cursoragent@cursor.com>'" HEAD
done

echo "=== Done ==="
