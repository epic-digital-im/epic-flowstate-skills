---
name: flowstate-using-git-worktrees
description: Use when starting feature work, executing implementation plans, or needing workspace isolation - creates isolated git worktrees with directory selection, safety verification, and baseline testing
---

# Using Git Worktrees

**Status:** Active
**Purpose:** Create isolated workspaces sharing the same repository for parallel branch work
**Scope:** Feature development, plan execution, any work needing branch isolation
**Trigger:** Starting implementation that should not affect the current working tree
**Input:** Branch name, feature description
**Output:** Isolated worktree with dependencies installed and baseline tests passing

---

## Overview

```
Select Directory → Verify Safety → Create Worktree → Setup Dependencies → Baseline Test → Report
       (1)              (2)              (3)                (4)                 (5)          (6)
```

---

## Step 1: Select Directory

**Who:** Assigned agent
**Pause:** No

### Actions

Check in priority order:

1. **Existing directory** — does `.worktrees/` or `worktrees/` already exist?

   ```bash
   ls -d .worktrees 2>/dev/null
   ls -d worktrees 2>/dev/null
   ```

   - If found: use that directory
   - Both exist: `.worktrees/` wins (hidden preferred)

2. **CLAUDE.md preference** — does the project specify a worktree location?

   ```bash
   grep -i "worktree.*director" CLAUDE.md 2>/dev/null
   ```

   - If specified: use it without asking

3. **Ask user** — if no directory exists and no preference found:
   - Option 1: `.worktrees/` (project-local, hidden) — recommended
   - Option 2: Custom path

### Done when

- Worktree directory path determined

---

## Step 2: Verify Safety

**Who:** Assigned agent
**Pause:** No

### Actions

For project-local directories (`.worktrees/` or `worktrees/`), verify the directory is git-ignored:

```bash
git check-ignore -q .worktrees 2>/dev/null
```

If NOT ignored:

1. Add to `.gitignore`
2. Commit the `.gitignore` change
3. Proceed with worktree creation

**Why critical:** Prevents accidentally committing worktree contents to the repository.

### Done when

- Worktree directory is confirmed git-ignored (or was just added to .gitignore)

---

## Step 3: Create Worktree

**Who:** Assigned agent
**Pause:** No

### Actions

```bash
# Detect project name
project=$(basename "$(git rev-parse --show-toplevel)")

# Create worktree with new branch
git worktree add ".worktrees/<branch-name>" -b "<branch-name>"

# Enter worktree
cd ".worktrees/<branch-name>"
```

### Done when

- Worktree created at the selected path
- New branch created and checked out in the worktree

---

## Step 4: Setup Dependencies

**Who:** Assigned agent
**Pause:** No

### Actions

Auto-detect and install based on project files:

| Detected File       | Command                           |
| ------------------- | --------------------------------- |
| `yarn.lock`         | `yarn install`                    |
| `package-lock.json` | `npm install`                     |
| `pnpm-lock.yaml`    | `pnpm install`                    |
| `Cargo.toml`        | `cargo build`                     |
| `requirements.txt`  | `pip install -r requirements.txt` |
| `go.mod`            | `go mod download`                 |

For this monorepo: `yarn install` (Yarn 4 workspaces).

### Done when

- Dependencies installed without errors

---

## Step 5: Baseline Test

**Who:** Assigned agent
**Pause:** Yes — if tests fail, report and ask before proceeding

### Actions

Run the project's test suite to verify a clean baseline:

```bash
yarn test           # or npm test, cargo test, pytest, etc.
```

- **Tests pass:** Report count, proceed
- **Tests fail:** Report failures. Ask user whether to proceed or investigate.

**Never proceed with a failing baseline without explicit permission.** You won't be able to distinguish new bugs from pre-existing issues.

### Done when

- Baseline test results recorded
- Clean baseline confirmed (or user explicitly approved proceeding with known failures)

---

## Step 6: Report

**Who:** Assigned agent
**Pause:** No

### Actions

```
Worktree ready at <full-path>
Branch: <branch-name>
Tests: <N> passing, <N> failures
Ready to implement <feature-description>
```

### Done when

- Location and status reported

---

## Quick Reference

| Situation                | Action                                 |
| ------------------------ | -------------------------------------- |
| `.worktrees/` exists     | Use it (verify ignored)                |
| `worktrees/` exists      | Use it (verify ignored)                |
| Both exist               | Use `.worktrees/`                      |
| Neither exists           | Check CLAUDE.md, then ask user         |
| Directory not ignored    | Add to .gitignore, commit, proceed     |
| Baseline tests fail      | Report failures, ask before proceeding |
| No package manager files | Skip dependency install                |

---

## Red Flags — STOP

- Creating worktree without verifying it's git-ignored (project-local)
- Skipping baseline test verification
- Proceeding with failing baseline tests without asking
- Assuming directory location when ambiguous
- Starting implementation on main/master without explicit user consent

---

## FlowState Integration

- `flowstate-task-execution` Step 2 invokes this skill for worktree isolation
- `flowstate-subagent-development` uses this skill before dispatching implementers
- `flowstate-finishing-branch` handles cleanup of worktrees created by this skill
- Branch naming convention: `feature/<task-id>-<short-description>` or `fix/<task-id>-<short-description>`

---

## Conventions

| Item                | Convention                                                                    |
| ------------------- | ----------------------------------------------------------------------------- |
| Default directory   | `.worktrees/` (hidden, project-local)                                         |
| Safety verification | Always check git-ignore before creating project-local worktrees               |
| Baseline required   | Run tests before starting work — no exceptions                                |
| Failing baseline    | Report and ask — never silently proceed                                       |
| Branch naming       | `feature/<description>` or `fix/<description>`                                |
| Cross-reference     | `flowstate-task-execution` Step 2 for worktree creation during task lifecycle |
| Cross-reference     | `flowstate-finishing-branch` for worktree cleanup after completion            |

---

_Created: 2026-03-30_
