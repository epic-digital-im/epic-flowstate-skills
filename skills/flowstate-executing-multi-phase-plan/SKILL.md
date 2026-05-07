---
name: flowstate-executing-multi-phase-plan
description: Use when a milestone has phase tasks from multi-phase planning ready for execution - iterates tasks in sortOrder, runs task-execution for each, then triggers milestone finishing and completion.
---

# Executing Multi-Phase Plan

**Status:** Active
**Purpose:** Execute phase tasks created by multi-phase planning, orchestrating the full milestone lifecycle
**Scope:** All milestones with phase tasks created by `flowstate-multi-phase-planning`
**Trigger:** Multi-phase planning completes (milestone has N phase tasks in "Planned" status)
**Input:** Milestone with N phase tasks, each describing a phase's goal, scope, and deliverables
**Output:** All tasks executed, milestone reviewed and completed
**Previous Process:** [Multi-Phase Planning](flowstate-multi-phase-planning)
**Next Process:** Project complete (or next milestone if multiple exist)

---

## Overview

After `flowstate-multi-phase-planning` creates a milestone with phase tasks, this process iterates through each task in `sortOrder` and runs `flowstate-task-execution` for the full 10-step lifecycle. Each task-execution invocation creates its own detailed implementation plan (Step 1), worktree (Step 2), and PR (Step 5).

When all tasks are complete, this process invokes milestone finishing (code review) and completion.

```
Load Project -> Get Tasks -> Execute Task -> More Tasks?
     (0)           (1)           (2)            (3)
                                                 |
                                                 v
                        Project Check <- Complete Milestone <- Finish Milestone
                             (6)               (5)                  (4)
```

---

## Prerequisites

Before starting:

- A project exists in FlowState with a milestone from `flowstate-multi-phase-planning`
- The milestone has phase tasks with descriptions including goal, scope, deliverables, and acceptance criteria
- Tasks are in "Planned" status ordered by `sortOrder`
- You have `orgId` and `workspaceId` from `.flowstate/config.json`

---

## Step 0: Read Config & Load Project Context

**Who:** Assigned agent
**Pause:** No

### Actions

1. **Read `.flowstate/config.json` from the repository root** to obtain `orgId`, `workspaceId`, `codebaseId`:
   ```
   Read .flowstate/config.json -> extract orgId, workspaceId, codebaseId
   ```
   IDs are NEVER guessed, inferred from project names, or recalled from memory. They must be read from the file.

2. Fetch the project from FlowState using the real orgId:
   ```
   collection-get projects <project_id> orgId=<orgId from config>
   ```
3. Record `title`, `description` from the project
4. Extract the design spec path from the project description (the `**Design Spec:**` reference)
5. Read the design spec for overall context

### Done when

- Config file read and orgId, workspaceId, codebaseId extracted
- Project context loaded (title, description)
- Design spec content available for reference

---

## Step 1: Get Tasks in Sort Order

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query the milestone for the project:
   ```
   collection-query milestones { "projectId": "<project_id>", "orgId": "<orgId>" }
   ```
2. Query all tasks for the milestone:
   ```
   collection-query tasks { "milestoneId": "<milestone_id>", "orgId": "<orgId>" }
   ```
3. Sort tasks by `sortOrder` (ascending: Phase 1 first)
4. Filter to tasks that are NOT already "Complete" (supports resuming)
5. Set the first incomplete task as the current task

### Done when

- Ordered list of tasks available
- Current task identified (first incomplete by sortOrder)

---

## Step 2: Execute Current Task

**Who:** Assigned agent
**Pause:** Yes (each task goes through the full 10-step lifecycle)

### Actions

1. Invoke `flowstate-task-execution` for the current task
2. `flowstate-task-execution` handles the full lifecycle:
   - Step 0: Set In Progress, create 10 sub-tasks
   - Step 1: Create implementation plan (via `flowstate-writing-plans`)
   - Step 2: Create worktree
   - Step 3: Execute development
   - Step 4: Update task with results
   - Step 5: Create PR into dev
   - Step 6: Code review
   - Step 7: Resolve review feedback
   - Step 8: Merge PR & cleanup
   - Step 9: Mark task complete
3. When `flowstate-task-execution` returns, the task is "Complete"

### Done when

- Current task status is "Complete"
- Task-execution has returned control

---

## Step 3: Check for Next Task

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query remaining incomplete tasks for the milestone:
   ```
   collection-query tasks { "milestoneId": "<milestone_id>", "status": { "$ne": "Complete" }, "orgId": "<orgId>" }
   ```
   Filter out sub-tasks (tasks with `parentTaskId` set) since those are managed by task-execution.

2. If more phase tasks exist:
   - Set the next task (by `sortOrder`) as the current task
   - Return to Step 2 (Execute Current Task)

3. If all phase tasks are complete:
   - Proceed to Step 4 (Finish Milestone)

4. If a task fails or blocks:
   - Record the failure in the task description
   - Ask the user whether to skip, retry, or abort the milestone

### Done when

- Either: next task selected and loop continues at Step 2
- Or: all phase tasks complete, proceed to milestone finish

---

## Step 4: Finish Milestone

**Who:** Assigned agent
**Pause:** Depends on review findings

### Actions

1. Invoke `flowstate-finishing-milestone` for the milestone
2. `flowstate-finishing-milestone` will:
   - Perform a milestone-level code review against the design spec
   - Create followup tasks for any issues found
   - Execute followup tasks via `flowstate-task-execution`
3. When `flowstate-finishing-milestone` returns, the milestone is reviewed and all followups are complete

### Done when

- Milestone-level code review complete
- All followup tasks (if any) are complete

---

## Step 5: Complete Milestone

**Who:** Assigned agent
**Pause:** No

### Actions

1. Invoke `flowstate-completing-milestone` for the milestone
2. `flowstate-completing-milestone` will:
   - Verify all tasks (including followups) are complete
   - Update milestone status to "Complete"
   - Create a completion discussion on the project

### Done when

- Milestone status is "Complete" with `completed: true`
- Completion discussion posted

---

## Step 6: Check Project Status

**Who:** Assigned agent
**Pause:** No

### Actions

1. Check if there are remaining incomplete milestones on the project:
   ```
   collection-query milestones { "projectId": "<project_id>", "status": { "$ne": "Complete" }, "orgId": "<orgId>" }
   ```
2. If more milestones exist:
   - Report to user: "Milestone complete. Project has <N> remaining milestones."
   - The next milestone can be executed by re-invoking this process
3. If all milestones are complete:
   - Update the project status:
     ```
     collection-update projects <project_id> { "status": "Complete", "completed": true, "orgId": "<orgId>" }
     ```
   - Create a project completion discussion:
     ```
     collection-create discussions {
       entityType: "project",
       entityId: "<project_id>",
       content: "## Project Complete\n\nAll milestones and phase tasks have been executed, reviewed, and completed.\n\n| Phase | Task | Status |\n|-------|------|--------|\n| 1 | task_XXX | Complete |\n| 2 | task_YYY | Complete |\n...",
       userName: "<agent characterName from metadata>",
       userId: "<agent teamMemberId from metadata>",
       orgId: "<orgId>",
       workspaceId: "<workspaceId>",
       threadDepth: 0,
       isEdited: false,
       isDeleted: false
     }
     ```

### Done when

- Either: user informed of remaining milestones
- Or: all milestones complete and project marked "Complete"

---

## FlowState Entity Map

| Step | Entity Type | Collection    | Purpose                    |
| ---- | ----------- | ------------- | -------------------------- |
| 6    | Discussion  | `discussions` | Project completion summary |

All other entity operations are delegated to sub-processes:

- `flowstate-task-execution` handles task lifecycle entities (sub-tasks, plans, PRs)
- `flowstate-finishing-milestone` handles review and followup entities
- `flowstate-completing-milestone` handles milestone completion entities

---

## Process Diagram

```
+--------------------------------------------------------------------------+
|                   EXECUTING MULTI-PHASE PLAN                              |
|                                                                          |
|  +----------+   +----------+                                             |
|  | 0: Load  |-->| 1: Get   |                                            |
|  | Project  |   | Tasks    |                                             |
|  +----------+   +----+-----+                                             |
|                      |                                                    |
|                      v                                                    |
|  +-----------------------------------------------------------+          |
|  | Per Task (loop by sortOrder)                               |          |
|  |                                                            |          |
|  |  +----------+   +----------+                               |          |
|  |  | 2: Execute-->| 3: More  |                               |          |
|  |  | Task     |   | Tasks?   |                               |          |
|  |  | (10-step)|   +----+-----+                               |          |
|  |  +----------+        |                                     |          |
|  |                      +--- yes --> loop to Step 2           |          |
|  |                      |                                     |          |
|  +----------------------|-------------------------------------+          |
|                         |                                                |
|                         +--- no (all complete)                           |
|                         |                                                |
|                         v                                                |
|  +----------+   +----------+   +----------+                             |
|  | 6: Project<--| 5: Complete<--| 4: Finish|                            |
|  | Check    |   | Milestone |   | Milestone|                            |
|  +----------+   +----------+   +----------+                             |
+--------------------------------------------------------------------------+
```

---

## Error Handling

| Situation                        | Action                                                    |
| -------------------------------- | --------------------------------------------------------- |
| Task execution fails for a task  | Record failure, ask user: skip, retry, or abort milestone |
| Milestone review finds issues    | `flowstate-finishing-milestone` creates followup tasks    |
| All followup tasks fail          | Escalate to user                                          |
| No tasks found for milestone     | Run `flowstate-multi-phase-planning` first                |
| Task has parentTaskId (sub-task) | Skip it; sub-tasks are managed by task-execution          |

---

## Conventions

| Item                   | Convention                                                   |
| ---------------------- | ------------------------------------------------------------ |
| Task processing        | By `sortOrder` ascending (Phase 1 first)                     |
| Sub-task filtering     | Exclude tasks with `parentTaskId` when listing phase tasks   |
| Resumability           | Skips completed tasks when re-invoked                        |
| Sub-process delegation | Task lifecycle, milestone review, and completion are separate |
| Implementation plans   | Created per-task at task-execution Step 1, not by this skill |

---

_Created: 2026-03-29_
_Revised: 2026-03-30 (tasks already exist from multi-phase planning, no milestone loop)_
