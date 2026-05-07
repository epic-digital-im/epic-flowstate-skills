---
name: flowstate-subtask-template
description: Use when starting a FlowState task (Step 0 of task-execution-process) to create the 10 standard sub-tasks - provides the exact title, description, sortOrder, and priority for each sub-task in the task execution lifecycle.
---

# Sub-Task Template

**Purpose:** Standard sub-tasks created for every parent task during Step 0 of the task execution process.
**Reference:** See `task-execution-process.md` for full process details.

---

## Template

When a task enters "In Progress", create these 10 sub-tasks in FlowState. All sub-tasks share:

- `orgId`: copied from parent task
- `workspaceId`: copied from parent task
- `projectId`: copied from parent task
- `milestoneId`: copied from parent task
- `parentTaskId`: the parent task ID
- `status`: "Planned"
- `completed`: false
- `archived`: false
- `version`: 1

---

## Sub-Tasks

### Sub-task 0

| Field         | Value                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`       | `0: Set task In Progress`                                                                                                                                    |
| `description` | Update parent task status to "In Progress". Create all 10 sub-tasks from the sub-task template. Verify parent task has description with acceptance criteria. |
| `sortOrder`   | 0                                                                                                                                                            |
| `priority`    | 1                                                                                                                                                            |

### Sub-task 1

| Field         | Value                                                                                                                                                                                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `1: Create implementation plan`                                                                                                                                                                                                                                                   |
| `description` | Run the flowstate-writing-plans skill against the parent task requirements. Save plan to `docs/plans/YYYY-MM-DD-<task-slug>.md`. Plan must include FlowState task/milestone/project IDs at top. Update parent task description with plan file path reference. Commit plan to git. |
| `sortOrder`   | 1                                                                                                                                                                                                                                                                                 |
| `priority`    | 1                                                                                                                                                                                                                                                                                 |

### Sub-task 2

| Field         | Value                                                                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`       | `2: Create worktree`                                                                                                                                                                                                                                         |
| `description` | Create a git worktree for isolated development. Branch name: `<parent_task_id>`. Worktree directory: `../<parent_task_id>` (sibling to main repo). Base branch: `origin/dev` (fetch latest first). Install dependencies with `yarn install` in the worktree. |
| `sortOrder`   | 2                                                                                                                                                                                                                                                            |
| `priority`    | 1                                                                                                                                                                                                                                                            |

### Sub-task 3

| Field         | Value                                                                                                                                                                                                                                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `3: Execute development`                                                                                                                                                                                                                                                                                                                             |
| `description` | Run flowstate-subagent-development skill in the worktree. Follow the implementation plan from step 1. Use TDD where applicable. Commit incrementally with conventional commits. All commits end with "Built with Epic Flowstate". Verify: `yarn test`, `yarn typecheck`, `yarn lint` all pass. All acceptance criteria from parent task must be met. |
| `sortOrder`   | 3                                                                                                                                                                                                                                                                                                                                                    |
| `priority`    | 1                                                                                                                                                                                                                                                                                                                                                    |

### Sub-task 4

| Field         | Value                                                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `4: Update task with results`                                                                                                                                                                |
| `description` | Compile completion summary: files changed, test results, deliverables, deviations from plan. Append "Completion Summary" section to parent task description via FlowState collection-update. |
| `sortOrder`   | 4                                                                                                                                                                                            |
| `priority`    | 1                                                                                                                                                                                            |

### Sub-task 5

| Field         | Value                                                                                                                                                                                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `5: Create PR into dev`                                                                                                                                                                                                                                                                              |
| `description` | Push worktree branch to origin. Create PR targeting `dev` branch using `gh pr create`. PR title follows conventional commits. PR body includes: summary bullets, FlowState task/milestone/project IDs, plan file reference, test plan checklist. Footer: "Built with Epic Flowstate". Record PR URL. |
| `sortOrder`   | 5                                                                                                                                                                                                                                                                                                    |
| `priority`    | 1                                                                                                                                                                                                                                                                                                    |

### Sub-task 6

| Field         | Value                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `6: Code review`                                                                                                                                                                                                                                                                                                                                                                       |
| `description` | Follow the `flowstate-code-review` skill to dispatch a code reviewer sub-agent for the full PR diff range (merge-base to HEAD). Record review output: strengths, issues by severity (Critical/Important/Minor), assessment. Update parent task description with "Code Review" section containing findings. Create a FlowState discussion on this sub-task with the full review output. |
| `sortOrder`   | 6                                                                                                                                                                                                                                                                                                                                                                                      |
| `priority`    | 1                                                                                                                                                                                                                                                                                                                                                                                      |

### Sub-task 7

| Field         | Value                                                                                                                                                                                                                                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `7: Resolve review feedback`                                                                                                                                                                                                                                                                                                                                            |
| `description` | Fix all Critical and Important issues from the code review. Minor issues: fix if quick, otherwise defer with documented rationale. Run `yarn test` and `yarn typecheck` after fixes. Commit fixes, push to update PR. If Critical/Important issues were found, dispatch code reviewer again for re-review. Repeat until all Critical and Important issues are resolved. |
| `sortOrder`   | 7                                                                                                                                                                                                                                                                                                                                                                       |
| `priority`    | 1                                                                                                                                                                                                                                                                                                                                                                       |

### Sub-task 8

| Field         | Value                                                                                                                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `8: Merge PR & cleanup`                                                                                                                                                                                   |
| `description` | Merge the PR into dev: `gh pr merge <pr_number> --squash --delete-branch`. Remove local worktree: `git worktree remove ../<task_id>`. Delete local branch if not auto-deleted: `git branch -d <task_id>`. |
| `sortOrder`   | 8                                                                                                                                                                                                         |
| `priority`    | 1                                                                                                                                                                                                         |

### Sub-task 9

| Field         | Value                                                                                                                                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `9: Mark task complete`                                                                                                                                                                                                                                                               |
| `description` | Update parent task status to "Complete" and `completed: true` via FlowState. Check if all tasks in milestone are complete; if so, update milestone status to "Complete". Identify the next task in the milestone by sortOrder and begin Step 0 for that task to continue the process. |
| `sortOrder`   | 9                                                                                                                                                                                                                                                                                     |
| `priority`    | 1                                                                                                                                                                                                                                                                                     |

---

## Creation Script (pseudo-code)

```
parentTask = collection-get tasks <parent_task_id>

for step in [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]:
  collection-create tasks {
    title: "<step>: <step_name>",
    description: "<step_description>",
    orgId: parentTask.orgId,
    workspaceId: parentTask.workspaceId,
    projectId: parentTask.projectId,
    milestoneId: parentTask.milestoneId,
    parentTaskId: parentTask.id,
    status: "Planned",
    completed: false,
    archived: false,
    sortOrder: step,
    priority: 1,
    version: 1
  }
```

---

## Dependency Chain

Sub-tasks execute sequentially. Each step depends on the previous:

```
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
                                ↑       │
                                └───────┘ (re-review loop if needed)
```

Step 3 (development) is the longest. Steps 0-2 are setup. Steps 6-7 form a review loop. Steps 8-9 are teardown and transition to the next task.

---

_Created: 2026-03-28_
