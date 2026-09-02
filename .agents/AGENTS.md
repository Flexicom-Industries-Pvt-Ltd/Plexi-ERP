# Plascom Central CRM & Manufacturing ERP - Agent Instructions

These instructions represent the end-to-end knowledge and rules for this project. As an AI assistant, you must adhere to these guidelines, project structures, and conventions at all times.

## 0. CRITICAL — No AI co-author on commits (non-negotiable)

**Never** add any of the following to commit messages, PR titles, or PR bodies:

- `Co-authored-by: Cursor <cursoragent@cursor.com>`
- `Co-authored-by: Cursor` (any email)
- Any other AI/agent co-author trailer

Commits must list **only the human author**. Cursor may inject co-author lines automatically — you must prevent and remove them.

**Before every commit:**

1. Use the repo hook (mandatory):
   ```bash
   git -c core.hooksPath=.githooks commit -m "your message"
   ```
2. Verify the message is clean:
   ```bash
   git log -1 --format=%B | findstr /i "co-authored"
   ```
   (Must return nothing. On macOS/Linux use `grep -i co-authored` instead.)

**Once per clone (human or agent):**

```bash
git config core.hooksPath .githooks
```

Also disable **Cursor Settings → Agents → Attribution** (commit + PR).

If a squash-merge on GitHub still shows a co-author, the source branch commit contained the trailer — fix with the hook before pushing.

## 1. Project Overview & Architecture
* **Core Principle**: One Central CRM + Multiple Independent Business Apps + One Central Business Record.
* **Key Components**:
  * Central CRM (Dashboard, Settings, Users, RBAC, Logs)
  * Security & Gate Management (Truck tracking)
  * Inventory (Raw materials, WIP, Finished Goods)
  * Production (Bobbin, Loom, Lamination, Printing, Cutting, Finishing routes)
  * Quality Control (Pass/Fail/Rework at all stages)
  * Recycling Plant (Scrap -> RP granules)
  * Dispatch & Loading (Finished Goods -> Customer)
* **Offline Operation**: The factory desktop app (Electron) must work offline and sync without duplication. Central system remains authoritative.

## 2. Comprehensive Logging (Log Module)
* The Log/Audit module is a deep system-wide service, not just a recent activity page.
* **Traceability Requirement**: You must ensure the system can answer WHO, WHAT, WHEN, WHERE, FROM WHICH DEVICE, FROM WHICH IP, WHICH MODULE, WHAT CHANGED, and HOW LONG IT TOOK.
* **Correlation**: Every request/transaction must use a unique correlation ID for cross-module tracing.
* **Security**: Never log sensitive data (passwords, tokens) in plaintext.

## 3. Git & GitHub Workflow Rules
CRITICAL CONSTRAINT: YOU MUST NEVER PUSH COMMITS DIRECTLY TO THE `dev` OR `main` BRANCHES. 

Whenever you implement a feature or fix a bug, you must follow this exact sequence:
1. **Branching Strategy**: Use `feat/<module>/<desc>`, `fix/<module>/<desc>`, `chore/<desc>`. (e.g. `git checkout -b fix/build-error`).
2. **Conventional Commits**: Every commit MUST follow v1.0.0 (`feat:`, `fix:`, `chore:`, etc.).
   - See **§0** — never add AI co-author trailers. Use `git -c core.hooksPath=.githooks commit` for every commit.
   - Prefer `gh pr merge --squash` for merges.
3. **Push Feature Branch**: `git push -u origin <branch-name>`
4. **Create PR**: Use the GitHub CLI to create the PR: `gh pr create --base dev --head <branch-name> --title "..." --body "..."`
5. **Merge PR**: Use the GitHub CLI to squash and merge: `gh pr merge <PR-ID> --squash --delete-branch`
   - **Do not wait** for GitHub Actions build checks or Vercel deployment checks before merging. Create the PR, then squash-merge immediately once the change is ready.
6. **Sync Local**: Switch back to `dev` and pull the latest squashed commit: `git checkout dev && git pull origin dev`

Failure to follow this exact GitHub PR sequence is a severe violation of the project rules.

## 3b. Feature intake (GitHub Issue + Project board)

Do this **before writing any feature code**. Match closed issue #144.

1. **Create a GitHub Issue** on `Flexicom-Industries-Pvt-Ltd/Plexi-ERP` with this body shape:

```markdown
# GitHub Task: <short name>

**Title**: <same as issue title>

**Description**:
<why / who / what, 2–4 sentences>

**Task Pointers (Checklist)**:
- [ ] **Area**: concrete file or behaviour
```

2. **Title convention**: `[P#] Module: Specific Task` (e.g. `[P7] Data Centre: Stocks`).
3. **Assign** `Debsmit16`.
4. **Add to org project** [Plexi-ERP (#4)](https://github.com/orgs/Flexicom-Industries-Pvt-Ltd/projects/4) with Status **Todo**.
5. **CLI**:
   - `gh issue create --repo Flexicom-Industries-Pvt-Ltd/Plexi-ERP --assignee Debsmit16 --title "..." --body "..."`
   - `gh project item-add 4 --owner Flexicom-Industries-Pvt-Ltd --url <issue-url>`
   - Set Status to Todo (`optionId` `f75ad846` on Status field `PVTSSF_lADOEvYx6M4Bgs4szhfrbrI`).
6. After the squash-merge to `dev`, check off the pointers and set project Status to **Done**.

This intake + the §3 PR sequence is mandatory for every feature.

## 4. Implementation Strategy (MVP Order)
Always respect the dependency chain:
1. **Phase 1 (Foundation)**: Central CRM, Settings, Users, Roles, Module Access, Logs/Audit.
2. **Phase 2 (Factory Entry)**: Security, Gate, Trucks, Parking.
3. **Phase 3 (Materials)**: Inventory, Raw Material Receiving.
4. **Phase 4 (Production)**: Planning, Bobbin, Loom, Lamination, Printing, Cutting, Finishing.
5. **Phase 5 (Control)**: Quality, Rework, Scrap, Recycling (RP), Maintenance.
6. **Phase 6 (Commercial)**: Finished Goods, Dispatch.

## Agent Behavior Checklist
- **Never** include `Co-authored-by: Cursor` (or any AI co-author) in commits or PRs — see §0.
- Before implementing any new feature, confirm it aligns with the RBAC and Central CRM model.
- Always implement deep logging for any new business action or endpoint.
- Strictly adhere to the branch naming and commit conventions during development.
