---
name: flowstate-finishing-milestone
description: Use when all tasks in a milestone are complete and a milestone-level code review is needed against the original design spec - dispatches code review, creates followup tasks for issues found, and executes followups before handing off to milestone completion.
---

# Finishing Milestone

**Status:** Active
**Purpose:** Perform a comprehensive code review of a completed milestone's deliverables against the original design spec, create and execute followup tasks for any issues found
**Scope:** All milestones that have completed their task execution
**Trigger:** All tasks in a milestone reach "Complete" status (called by `flowstate-executing-multi-phase-plan` Step 5)
**Input:** A milestone with all tasks complete
**Output:** A reviewed milestone with all followup tasks (if any) also complete
**Previous Process:** [Task Execution](flowstate-task-execution) (final task completes)
**Next Process:** [Completing Milestone](flowstate-completing-milestone)

---

## Overview

When all tasks in a milestone are complete, this process reviews the ENTIRE milestone's work against the original design spec. Unlike the per-task code review in `flowstate-task-execution` Step 6 (which reviews individual task changes), this review examines cross-task integration, completeness against the spec, and overall quality.

```
Load Context -> Gather Changes -> Dispatch Review -> Parse Findings -> Create Followups -> Execute Followups
     (0)             (1)              (2)                (3)               (4)                  (5)
```

---

## Prerequisites

Before starting:

- A milestone exists with all tasks in "Complete" status
- The parent project has a design spec document
- The milestone has a phase plan document
- All task branches have been merged to `dev`

---

## Step 0: Load Milestone Context

**Who:** Assigned agent
**Pause:** No

### Actions

1. Fetch the milestone from FlowState:
   ```
   collection-get milestones <milestone_id>
   ```
2. Fetch the parent project:
   ```
   collection-get projects <project_id>
   ```
3. Extract the design spec path from the project description (`**Design Spec:**`)
4. Extract the phase plan path from the milestone description (`**Phase Plan:**`)
5. Read both the design spec and phase plan from the filesystem
6. Record `orgId`, `workspaceId`, `projectId`, `milestoneId`

### Done when

- Milestone and project context loaded
- Design spec and phase plan content available
- All IDs recorded for entity creation

---

## Step 1: Gather Milestone Changes

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query all completed tasks in the milestone:
   ```
   collection-query tasks { "milestoneId": "<milestone_id>", "status": "Complete" }
   ```
2. For each task, extract from its description:
   - Branch name (task ID)
   - Files changed (from the Completion Summary section)
   - PR reference (if recorded)
3. Compile a consolidated list of all files changed across the milestone
4. Get the combined diff of the milestone's work against the base:

   ```bash
   # Find the merge base before the first task's work
   git log --oneline dev --since="<milestone_start>" --until="now" | tail -1
   ```

   Or use the milestone's task branches to identify the change range.

5. Build a milestone change summary:
   - Total files changed
   - Key areas modified (packages, modules)
   - Test coverage added

### Done when

- All task completion summaries collected
- Consolidated change list available
- Change scope is understood

---

## Step 1.5: Run Feature Matrix Sync

**Who:** Assigned agent
**Pause:** Yes (if changes found)

### Actions

1. **Run feature matrix sync** via `flowstate-feature-matrix-sync` skill:
   - Read the combined git diff from all merged task branches in this milestone
   - Match changed files to features in the org-wide feature matrix
   - Propose status updates for any features whose implementation changed
   - Create gap items for any features that became `MISSING`
   - Apply approved changes
2. This ensures the feature matrix reflects the milestone's work before the milestone-level code review

### Done when

- Feature matrix sync has been run against the milestone's changes
- Any proposed status updates have been approved or rejected
- Gap items created for newly-missing features (if any)

---

## Step 2: Dispatch Milestone Code Review

**Who:** Assigned agent, using `flowstate-code-review`
**Pause:** No

### Actions

1. Invoke `flowstate-code-review` with milestone-level scope:
   - **What was implemented:** Summary of all tasks completed in the milestone
   - **Requirements reference:** The design spec AND the phase plan
   - **Review scope:** All files changed across all tasks in the milestone
   - **Review focus areas:**
     - Completeness: Does the implementation cover all spec requirements for this phase?
     - Integration: Do the individual task outputs work together correctly?
     - Consistency: Are patterns, naming, and architecture consistent across tasks?
     - Quality: Test coverage, error handling, accessibility

2. The review prompt should explicitly state:

   ```
   This is a MILESTONE-LEVEL review, not a single task review.
   Review ALL changes in the milestone against the design spec and phase plan.
   Focus on cross-task integration and spec completeness, not just code quality.
   ```

3. Record the full review output

### Done when

- Code review dispatched and completed
- Review output recorded with findings categorized by severity

---

## Step 3: Parse Review Findings

**Who:** Assigned agent
**Pause:** No

### Actions

1. Parse the code review output into categories:
   - **Bugs:** Functional issues, broken behavior
   - **Missing requirements:** Spec requirements not implemented in this phase
   - **Quality issues:** Code quality, test gaps, accessibility violations
   - **Refactoring:** Structural improvements needed for maintainability

2. For each finding, determine if it's actionable:
   - **Actionable:** Can be fixed with a focused task (create a followup)
   - **Deferred:** Belongs to a future phase or is out of scope (note but don't create a task)
   - **Informational:** No action needed (note in the review record)

3. Create a discussion on the milestone with the review summary:
   ```
   collection-create discussions {
     entityType: "milestone",
     entityId: "<milestone_id>",
     content: "## Milestone Code Review\n\n**Assessment:** <Clean / With Followups / Needs Major Work>\n\n### Findings Summary\n\n- **Bugs:** <count>\n- **Missing Requirements:** <count>\n- **Quality Issues:** <count>\n- **Refactoring:** <count>\n\n### Actionable Items\n\n<numbered list of items that will become followup tasks>\n\n### Deferred Items\n\n<items for future phases>\n\n### Details\n\n<full review output>",
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

- Findings categorized and assessed
- Review summary posted as a discussion on the milestone

---

## Step 4: Create Followup Tasks

**Who:** Assigned agent
**Pause:** No

### Actions

1. If no actionable findings: skip to Step 5 (clean review path)

2. For each actionable finding, create a followup task:

   ```
   collection-create tasks {
     title: "Followup: <concise finding title>",
     description: "**Source:** Milestone code review\n**Category:** <bug|missing-requirement|quality|refactoring>\n**Finding:**\n<detailed finding from review>\n\n**Acceptance Criteria:**\n- <specific fix criteria>",
     status: "Planned",
     milestoneId: "<milestone_id>",
     projectId: "<project_id>",
     orgId: "<orgId>",
     workspaceId: "<workspaceId>",
     sortOrder: <100 + N>,
     metadata: { "followup": true, "reviewSource": "milestone-review" },
     version: 1
   }
   ```

   - `sortOrder` starts at 100+ to sort after original tasks
   - `metadata.followup: true` distinguishes followups from original tasks

3. Update the milestone description to list followup tasks:
   ```
   collection-update milestones <milestone_id> {
     "description": "<existing>\n\n## Followup Tasks\n\n| # | Task | Category | ID |\n|---|------|----------|----|\n| 1 | <title> | <category> | <task_id> |\n..."
   }
   ```

### Done when

- Followup tasks created for all actionable findings
- Milestone description updated with followup task list
- Or: no actionable findings (clean review)

---

## Step 5: Execute Followup Tasks

**Who:** Assigned agent
**Pause:** Yes (per followup task)

### Actions

1. If no followup tasks were created (clean review):
   - Proceed directly to signal completion
   - No further action needed

2. For each followup task in order:
   a. Invoke `flowstate-task-execution` for the followup task
   b. `flowstate-task-execution` handles the full 10-step lifecycle
   c. When it returns, the followup task is "Complete"
   d. Move to the next followup task

3. After all followup tasks are complete:
   - Create a discussion on the milestone confirming all followups are resolved:
     ```
     collection-create discussions {
       entityType: "milestone",
       entityId: "<milestone_id>",
       content: "## Followup Tasks Complete\n\nAll <N> followup tasks from the milestone review have been resolved.\n\n| Task | Status |\n|------|--------|\n| <title> | Complete |\n...",
       ...
     }
     ```

### Done when

- All followup tasks are "Complete"
- Or: no followup tasks existed (clean review)
- Milestone is ready for `flowstate-completing-milestone`

---

## FlowState Entity Map

| Step | Entity Type | Collection    | Purpose                             |
| ---- | ----------- | ------------- | ----------------------------------- |
| 3    | Discussion  | `discussions` | Milestone review summary            |
| 4    | Task        | `tasks`       | Followup tasks from review findings |
| 5    | Discussion  | `discussions` | Followup completion confirmation    |

Review dispatch (Step 2) is delegated to `flowstate-code-review`.
Followup task execution (Step 5) is delegated to `flowstate-task-execution`.

---

## Process Diagram

```
+--------------------------------------------------------------------------+
|                      FINISHING MILESTONE                                   |
|                                                                          |
|  +----------+   +----------+   +----------+   +----------+              |
|  | 0: Load  |-->| 1: Gather|-->| 2: Review|-->| 3: Parse |              |
|  | Context  |   | Changes  |   | (code-   |   | Findings |              |
|  |          |   |          |   |  review) |   |          |              |
|  +----------+   +----------+   +----------+   +----+-----+              |
|                                                     |                    |
|                                         +-----------+-----------+       |
|                                         |                       |       |
|                                    (has findings)         (clean)       |
|                                         |                       |       |
|                                         v                       v       |
|                                  +----------+            +----------+   |
|                                  | 4: Create|            | Done:    |   |
|                                  | Followup |            | Ready for|   |
|                                  | Tasks    |            | complete |   |
|                                  +----+-----+            +----------+   |
|                                       |                                  |
|                                       v                                  |
|                                  +----------+                            |
|                                  | 5: Execute                           |
|                                  | Followups|                            |
|                                  | (per task)|                           |
|                                  +----------+                            |
|                                       |                                  |
|                                       v                                  |
|                                  +----------+                            |
|                                  | Done:    |                            |
|                                  | Ready for|                            |
|                                  | complete |                            |
|                                  +----------+                            |
+--------------------------------------------------------------------------+
```

---

## Error Handling

| Situation                             | Action                                                     |
| ------------------------------------- | ---------------------------------------------------------- |
| Design spec not found                 | Check project description, ask user for path               |
| Code review times out                 | Retry once, then ask user to review manually               |
| Followup task execution fails         | Record failure, ask user: skip, retry, or abort            |
| Too many followup tasks (>10)         | Prioritize by severity, batch remaining into a single task |
| Review finds issues from prior phases | Defer to a separate followup milestone, not this one       |

---

## Conventions

| Item                 | Convention                                                 |
| -------------------- | ---------------------------------------------------------- |
| Review scope         | ENTIRE milestone against design spec, not per-task         |
| Followup `sortOrder` | Starts at 100+ (after original tasks)                      |
| Followup `metadata`  | `{ "followup": true, "reviewSource": "milestone-review" }` |
| Clean review path    | Skip Steps 4-5, proceed directly to completion             |
| Review discussion    | Posted on the milestone entity                             |

---

_Created: 2026-03-29_
