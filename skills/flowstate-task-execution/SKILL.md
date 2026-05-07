---
name: flowstate-task-execution
description: Use when executing a FlowState task from planned to complete - provides the 10-step lifecycle covering implementation plan creation, git worktree isolation, sub-agent development, status updates, PR creation, code review, conflict resolution, and merge. Includes object hierarchy pre-flight check.
---

# Task Execution Process

**Status:** Active
**Purpose:** Standard operating procedure for executing FlowState tasks from "Planned" to "Complete"
**Scope:** All tasks under milestones in the flowstate-platform monorepo

---

## Overview

Every task follows a fixed 10-step lifecycle. Each step is tracked as a FlowState sub-task with `parentTaskId` pointing to the parent task. No step is skipped. The process ensures every task has an implementation plan, isolated worktree, sub-agent development, code review, and a clean PR into `dev`.

```
Planned → In Progress → Plan → Worktree → Develop → Update → PR → Review → Resolve → Merge → Complete
  (0)        (0)         (1)     (2)        (3)       (4)     (5)    (6)      (7)       (8)     (9)
```

---

## Prerequisites

Before starting any task:

- Parent milestone exists and is linked to a project
- Task exists in FlowState with `milestoneId` and `projectId` set
- Task has a description with acceptance criteria or deliverables
- The `dev` branch is up to date locally

### Object Hierarchy Check

All FlowState entities must be properly linked before execution. If any are missing, create them in order:

```
Org → Workspace → Codebase → Project → Milestone → Task
```

The `.flowstate/config.json` at the **root** of the project folder must contain `orgId`, `workspaceId`, and `codebaseId`. Each **package** in a monorepo must have its own `.flowstate/config.json` with `projectId`.

**See:** [object-hierarchy.md](./object-hierarchy.md) for the full pre-flight check procedure and create-if-missing rules.

| Schema Docs                                  | When to Reference                |
| -------------------------------------------- | -------------------------------- |
| [org-schema.md](./org-schema.md)             | If `orgId` is missing or invalid |
| [workspace-schema.md](./workspace-schema.md) | If `workspaceId` is missing      |
| [codebase-schema.md](./codebase-schema.md)   | If `codebaseId` is missing       |
| [project-schema.md](./project-schema.md)     | If `projectId` is missing        |
| [milestone-schema.md](./milestone-schema.md) | If `milestoneId` is missing      |
| [task-schema.md](./task-schema.md)           | Task field reference             |

---

## Step 0: Read Config & Set Task In Progress

**Sub-task title:** `0: Set task In Progress`
**Who:** The agent or engineer claiming the task

### Actions

1. **Read `.flowstate/config.json` from the repository root** to obtain `orgId`, `workspaceId`, `codebaseId`:
   ```
   Read .flowstate/config.json → extract orgId, workspaceId, codebaseId
   ```
   IDs are NEVER guessed, inferred from project names, or recalled from memory. They must be read from the file.

2. **Run RAG sync check** via `flowstate-rag-sync-check` skill:
   - Verify codebase is indexed (non-zero chunks)
   - Verify post-commit hook is installed
   - Auto-fix if needed (run sync + install hooks)
   - Block task start if checks fail after auto-fix attempt

3. Fetch the task from FlowState to confirm it's in "Planned" status (using orgId from config)
3. Update the task status to "In Progress":
   ```
   collection-update tasks <task_id> { "status": "In Progress", "orgId": "<from config>" }
   ```
4. Create all 10 sub-tasks using the sub-task template (see `subtask-template.md`)
5. Mark this sub-task (step 0) as "Complete"

### Done when

- Config file read and orgId, workspaceId, codebaseId extracted
- Task status is "In Progress"
- All 10 sub-tasks exist with `parentTaskId` set to the parent task ID

---

## Step 1: Create Implementation Plan

**Sub-task title:** `1: Create implementation plan`
**Who:** The agent using the `flowstate-writing-plans` skill

### Actions

1. Read the parent task description for requirements and acceptance criteria
2. Read the design spec referenced by the parent project (if applicable)
3. Invoke the `flowstate-writing-plans` skill
4. Save the plan to:

   ```
   docs/plans/YYYY-MM-DD-<task-slug>.md
   ```

   - `<task-slug>` is a kebab-case summary of the task (e.g., `phase1-api-core-infrastructure`)

5. The plan document MUST include at its top:
   ```markdown
   **FlowState Task:** `<task_id>`
   **FlowState Milestone:** `<milestone_id>`
   **FlowState Project:** `<project_id>`
   ```
6. Update the parent task description to append a reference:
   ```
   **Implementation Plan:** `docs/plans/YYYY-MM-DD-<task-slug>.md`
   ```
7. Commit the plan file to the current branch

### Plan document structure

The plan follows the `flowstate-writing-plans` skill output format. It must include:

- Task context (IDs, links to spec)
- File-by-file implementation steps
- Test strategy
- Verification criteria matching the task's acceptance criteria

### Done when

- Plan file exists at the specified path
- Plan references the FlowState task ID
- Parent task description includes the plan path
- Plan is committed to git

---

## Step 2: Create Worktree

**Sub-task title:** `2: Create worktree`
**Who:** The agent creating an isolated worktree

### Actions

1. Ensure `dev` branch is up to date:
   ```bash
   git fetch origin dev
   ```
2. Create a worktree using the task ID as the branch name:

   ```bash
   git worktree add ../<task_id> -b <task_id> origin/dev
   ```

   - Example: `git worktree add ../task_DlmMU0boSt -b task_DlmMU0boSt origin/dev`

3. Verify the worktree was created:
   ```bash
   git worktree list
   ```
4. Install dependencies in the worktree:
   ```bash
   cd ../<task_id> && yarn install
   ```

### Worktree naming convention

- Branch name: `<task_id>` (e.g., `task_DlmMU0boSt`)
- Worktree directory: `../<task_id>` (sibling to the main repo directory)

### Done when

- Worktree exists at `../<task_id>`
- Branch `<task_id>` is based on latest `origin/dev`
- Dependencies installed

---

## Step 3: Execute Development

**Sub-task title:** `3: Execute development`
**Who:** The agent using the `flowstate-subagent-development` skill

### Actions

1. Change to the worktree directory
2. Read the implementation plan created in Step 1
3. Invoke the `flowstate-subagent-development` skill
4. Follow the plan step by step, dispatching sub-agents for independent work
5. Run tests after each logical unit of work:
   ```bash
   yarn test
   yarn typecheck
   ```
6. Commit incrementally using conventional commits:

   ```
   feat(scope): description

   Built with Epic Flowstate
   ```

7. All acceptance criteria from the task description must be met

### Development rules

- Follow TDD where applicable
- No `any` types, strict TypeScript
- Run `yarn lint` before final commit
- Every source file needs the Apache-2.0 license header
- Do NOT run `yarn build` unless explicitly needed (use `yarn typecheck` + `yarn test`)

### Done when

- All acceptance criteria from the task are met
- Tests pass (`yarn test`)
- Types check (`yarn typecheck`)
- Lint passes (`yarn lint`)
- All changes committed to the worktree branch

---

## Step 4: Update Task with Results

**Sub-task title:** `4: Update task with results`
**Who:** The agent that completed development

### Actions

1. Compile a summary of what was built:
   - Files created or modified (count and key paths)
   - Test results (pass count, suite count)
   - Any deviations from the plan and why
2. Update the parent task description by appending:

   ```markdown
   ## Completion Summary

   **Status:** Development complete
   **Branch:** `<task_id>`
   **Files changed:** <count>
   **Tests:** <pass_count> passing across <suite_count> suites

   ### What was built

   - <bullet list of deliverables>

   ### Deviations from plan

   - <any changes from the original plan, or "None">
   ```

3. Update via FlowState:
   ```
   collection-update tasks <task_id> { "description": "<updated description>" }
   ```

### Done when

- Task description includes the completion summary
- Summary accurately reflects the work done

---

## Step 5: Create PR into Dev

**Sub-task title:** `5: Create PR into dev`
**Who:** The agent that completed development

### Actions

1. Push the worktree branch to origin:
   ```bash
   git push -u origin <task_id>
   ```
2. Create a pull request targeting `dev`:

   ```bash
   gh pr create --base dev --title "<conventional title>" --body "$(cat <<'EOF'
   ## Summary
   <1-3 bullet points from completion summary>

   ## FlowState
   - **Task:** `<task_id>`
   - **Milestone:** `<milestone_id>`
   - **Project:** `<project_id>`
   - **Plan:** `docs/plans/<plan-file>.md`

   ## Test Plan
   - [ ] `yarn test` passes
   - [ ] `yarn typecheck` passes
   - [ ] `yarn lint` passes
   - [ ] Acceptance criteria verified

   Built with Epic Flowstate
   EOF
   )"
   ```

3. Record the PR URL

### PR conventions

- Title follows conventional commits: `feat(scope): description`
- Body links back to FlowState task, milestone, project
- Body references the implementation plan
- Footer: `Built with Epic Flowstate`

### Done when

- PR created targeting `dev`
- PR body includes FlowState references
- Branch is pushed to origin

---

## Step 6: Code Review

**Sub-task title:** `6: Code review`
**Who:** The agent, using the `flowstate-code-review` skill

### Actions

1. Get the git SHA range for the full PR:
   ```bash
   BASE_SHA=$(git merge-base HEAD origin/dev)
   HEAD_SHA=$(git rev-parse HEAD)
   ```
2. Follow the `flowstate-code-review` skill to dispatch a code reviewer sub-agent with:
   - What was implemented (from the completion summary)
   - Plan/requirements reference
   - Base and head SHAs
3. Record the review output (strengths, issues by severity, assessment)
4. Update the parent task description to append a "Code Review" section:

   ```markdown
   ## Code Review

   **Reviewer:** flowstate-code-review
   **Assessment:** <Ready to merge / With fixes / Not ready>

   ### Issues Found

   - **Critical:** <count> (must fix before merge)
   - **Important:** <count> (should fix before merge)
   - **Minor:** <count> (nice to have)

   ### Details

   <full review output>
   ```

5. Create a FlowState discussion on this sub-task with the review findings:
   ```
   collection-create discussions {
     entityType: "task",
     entityId: "<code_review_subtask_id>",
     title: "Code Review: <task_title>",
     body: "<review output>",
     ...
   }
   ```

### Done when

- Code review has been dispatched and completed
- Parent task description includes the code review section
- Discussion item created on the code review sub-task
- All issues are categorized by severity

---

## Step 7: Resolve Review Feedback

**Sub-task title:** `7: Resolve review feedback`
**Who:** The agent that completed development

### Actions

1. Read the code review findings from Step 6
2. For each issue:
   - **Critical/Important:** Fix immediately in the worktree
   - **Minor:** Fix if quick, otherwise note as deferred with rationale
   - **Deferred items:** Add to parent task description under "Deferred Items" section
3. Run tests after all fixes:
   ```bash
   yarn test
   yarn typecheck
   ```
4. Commit fixes:

   ```
   fix(scope): address code review findings

   Built with Epic Flowstate
   ```

5. Push updates:
   ```bash
   git push
   ```
6. If Critical or Important issues were found, request a re-review by dispatching the code reviewer again on the fix commit range
7. Repeat until all Critical and Important issues are resolved

### Resolution rules

- Never skip Critical issues
- Never skip Important issues without user approval
- Minor issues may be deferred to a follow-up task with documented rationale
- Each fix round gets a commit and push before re-review

### Done when

- All Critical and Important issues resolved
- Re-review passes (if triggered)
- Fixes committed and pushed
- PR is updated on GitHub

---

## Step 8: Merge PR & Cleanup Worktree

**Sub-task title:** `8: Merge PR & cleanup`
**Who:** The agent, after review passes

### Actions

1. Merge the PR:

   ```bash
   gh pr merge <pr_number> --squash --delete-branch
   ```

   - Use `--squash` for clean history on `dev`
   - Use `--delete-branch` to remove the remote branch

2. Clean up the local worktree:
   ```bash
   git worktree remove ../<task_id>
   ```
3. Delete the local branch (if not auto-deleted):
   ```bash
   git branch -d <task_id>
   ```

### Done when

- PR is merged into `dev`
- Remote branch deleted
- Local worktree removed
- Local branch deleted

---

## Step 9: Mark Task Complete

**Sub-task title:** `9: Mark task complete`
**Who:** The agent, after merge and cleanup

### Actions

1. **Run feature matrix sync** via `flowstate-feature-matrix-sync` skill:
   - Read the git diff from the just-merged PR
   - Match changed files to features in the org-wide matrix
   - Propose status updates for any features whose implementation changed
   - Create gap items for any features that became `MISSING`
   - Apply approved changes

2. Update the parent task status:
   ```
   collection-update tasks <task_id> { "status": "Complete", "completed": true }
   ```
3. Signal completion to the calling workflow: "Task complete. Return control to the calling workflow."

**Note:** This process does NOT auto-complete milestones or identify next tasks. The calling workflow (`flowstate-executing-multi-phase-plan` or a direct invocation) is responsible for:

- Iterating to the next task
- Triggering milestone review via `flowstate-finishing-milestone`
- Marking milestones complete via `flowstate-completing-milestone`

This keeps task-execution composable -- it completes ONE task and returns.

### Done when

- Task status is "Complete" in FlowState
- Control returned to the calling workflow

---

## Process Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                       TASK EXECUTION                             │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │ 0: Set   │──>│ 1: Write │──>│ 2: Create│──>│ 3: Execute│    │
│  │ In Prog  │   │ Plan     │   │ Worktree │   │ Dev      │    │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘    │
│                                                     │            │
│                                                     v            │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │ 7: Resolve│<──│ 6: Code  │<──│ 5: Create│<──│ 4: Update│    │
│  │ Feedback │   │ Review   │   │ PR       │   │ Task     │    │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘    │
│       │              ^                                           │
│       │   (re-review │ if needed)                                │
│       └──────────────┘                                           │
│       │                                                          │
│       v                                                          │
│  ┌──────────┐   ┌──────────┐                                    │
│  │ 8: Merge │──>│ 9: Mark  │──> Return to calling workflow       │
│  │ & Cleanup│   │ Complete │                                    │
│  └──────────┘   └──────────┘                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

| Situation                               | Action                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Plan skill fails                        | Retry once, then escalate to user                                       |
| Worktree creation fails (branch exists) | Delete stale branch first: `git branch -D <task_id>`                    |
| Tests fail during development           | Fix before proceeding. Never create a PR with failing tests             |
| PR has merge conflicts                  | Rebase worktree branch onto latest `dev`, resolve conflicts             |
| Task is blocked by another task         | Set sub-task to "Blocked", add `blockedBy` reference, move to next task |

---

## Conventions

| Item           | Convention                                              |
| -------------- | ------------------------------------------------------- |
| Branch name    | `<task_id>` (e.g., `task_DlmMU0boSt`)                   |
| Worktree dir   | `../<task_id>` (sibling to main repo)                   |
| Plan file      | `docs/plans/YYYY-MM-DD-<task-slug>.md`                  |
| Commit format  | `type(scope): description\n\nBuilt with Epic Flowstate` |
| PR target      | `dev` branch                                            |
| Sub-task title | `<step_number>: <step_name>`                            |

---

_Created: 2026-03-28_
