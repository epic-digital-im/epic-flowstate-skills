---
name: flowstate-completing-milestone
description: Use when a milestone has passed its code review and all followup tasks are done - verifies all tasks complete, marks milestone as complete, posts completion discussion, and signals whether more milestones remain.
---

# Completing Milestone

**Status:** Active
**Purpose:** Mark a milestone as complete after all tasks (including followups) are done and the milestone review is clean
**Scope:** All milestones that have passed `flowstate-finishing-milestone`
**Trigger:** `flowstate-finishing-milestone` completes (review clean or all followups resolved)
**Input:** A milestone with all tasks complete and review resolved
**Output:** Milestone marked "Complete" with a completion discussion
**Previous Process:** [Finishing Milestone](flowstate-finishing-milestone)
**Next Process:** Returns to [Executing Multi-Phase Plan](flowstate-executing-multi-phase-plan) Step 7

---

## Overview

This is an intentionally simple process. The heavy lifting (code review, followup creation, followup execution) is handled by `flowstate-finishing-milestone`. This process performs safety verification and records the completion.

```
Verify Tasks -> Verify No Open Followups -> Mark Complete -> Post Discussion -> Signal Next
     (0)                 (1)                     (2)              (3)            (4)
```

---

## Prerequisites

Before starting:

- A milestone exists in FlowState
- `flowstate-finishing-milestone` has completed for this milestone
- All tasks (including followups) should be in "Complete" status

---

## Step 0: Verify All Tasks Complete

**Who:** Assigned agent
**Pause:** No

### Actions

1. Fetch the milestone:
   ```
   collection-get milestones <milestone_id>
   ```
2. Query all tasks in the milestone:
   ```
   collection-query tasks { "milestoneId": "<milestone_id>" }
   ```
3. Check that every task has `status: "Complete"`:
   - If any task is NOT complete, report which tasks are incomplete
   - Do NOT proceed until all tasks are complete
   - If blocked, escalate to the user

### Done when

- All tasks in the milestone are confirmed "Complete"

---

## Step 1: Verify No Open Followups

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query for followup tasks that are not complete:
   ```
   collection-query tasks {
     "milestoneId": "<milestone_id>",
     "status": { "$ne": "Complete" }
   }
   ```
2. Filter for any tasks with `metadata.followup: true` that are still open
3. If open followups exist:
   - Report which followups are still open
   - Return to `flowstate-finishing-milestone` Step 5 to execute them
   - Do NOT proceed until all followups are resolved

### Done when

- No open followup tasks remain
- All followup tasks (if any were created) are "Complete"

---

## Step 2: Mark Milestone Complete

**Who:** Assigned agent
**Pause:** No

### Actions

1. Update the milestone status:
   ```
   collection-update milestones <milestone_id> {
     "status": "Complete",
     "completed": true
   }
   ```

### Done when

- Milestone status is "Complete" with `completed: true`

---

## Step 3: Post Completion Discussion

**Who:** Assigned agent
**Pause:** No

### Actions

1. Compile a completion summary from all task completion summaries
2. Create a discussion on the project summarizing what was delivered:
   ```
   collection-create discussions {
     entityType: "project",
     entityId: "<project_id>",
     content: "## Milestone Complete: <milestone title>\n\n**Phase:** <phase number>\n**Tasks completed:** <count>\n**Followup tasks:** <count or 'None'>\n\n### Deliverables\n\n<bullet list of what was built across all tasks>\n\n### Key Files\n\n<most significant files created or modified>",
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

- Completion discussion posted on the project

---

## Step 4: Signal Next

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query remaining milestones:
   ```
   collection-query milestones { "projectId": "<project_id>", "status": { "$ne": "Complete" } }
   ```
2. If remaining milestones exist:
   - Report: "Milestone `<title>` complete. <N> milestones remaining. Return control to `flowstate-executing-multi-phase-plan`."
3. If no remaining milestones:
   - Report: "All milestones complete. Project is ready for final completion."

### Done when

- Remaining milestone count reported
- Control returned to the calling process

---

## FlowState Entity Map

| Step | Entity Type | Collection    | Purpose                      |
| ---- | ----------- | ------------- | ---------------------------- |
| 3    | Discussion  | `discussions` | Milestone completion summary |

All verification (Steps 0-1) is read-only. Milestone update (Step 2) is a single status change.

---

## Process Diagram

```
+--------------------------------------------------------------+
|                    COMPLETING MILESTONE                        |
|                                                              |
|  +----------+   +----------+   +----------+                  |
|  | 0: Verify|-->| 1: Verify|-->| 2: Mark  |                 |
|  | All Tasks|   | No Open  |   | Complete |                 |
|  | Complete |   | Followups|   |          |                 |
|  +----------+   +----------+   +----+-----+                 |
|                                      |                        |
|                                      v                        |
|  +----------+   +----------+                                 |
|  | 4: Signal|<--| 3: Post  |                                |
|  | Next     |   | Discussion                                |
|  +----------+   +----------+                                 |
|       |                                                       |
|       +---> Return to executing-multi-phase-plan             |
+--------------------------------------------------------------+
```

---

## Error Handling

| Situation                 | Action                                            |
| ------------------------- | ------------------------------------------------- |
| Tasks still incomplete    | Do not proceed; report which tasks are incomplete |
| Open followup tasks found | Return to `flowstate-finishing-milestone` Step 5  |
| Milestone update fails    | Retry once, check orgId/workspaceId               |
| Project not found         | Check milestone's `projectId`, fetch from config  |

---

## Conventions

| Item                    | Convention                                          |
| ----------------------- | --------------------------------------------------- |
| Completion verification | Read-only checks before any status change           |
| Discussion entity       | Posted on the PROJECT (not the milestone)           |
| Status values           | Milestone goes to "Complete" with `completed: true` |
| Return signal           | Text report, not a FlowState entity                 |

---

_Created: 2026-03-29_
