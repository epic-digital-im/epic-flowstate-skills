---
name: flowstate-multi-phase-planning
description: Use when an approved design spec needs to be decomposed into phased tasks before execution - creates one milestone for the design with N tasks (one per phase), each scoping goals, deliverables, and acceptance criteria. Triggered after brainstorming completes.
---

# Multi-Phase Planning Process

**Status:** Active
**Purpose:** Decompose an approved design spec into a single milestone with phased tasks
**Scope:** All projects with approved design specs that require phased implementation
**Trigger:** Brainstorming process completes (design spec approved)
**Input:** Approved design spec document (output of brainstorming-process.md)
**Output:** 1 milestone with N tasks (one per phase), ready for task execution
**Next Process:** [Executing Multi-Phase Plan](flowstate-executing-multi-phase-plan)

---

## Overview

After brainstorming produces an approved design spec, this process breaks the spec into implementation phases. The entire design becomes a **single milestone**. Each phase becomes a **task** under that milestone with a description that scopes its goal, deliverables, and acceptance criteria.

The detailed step-by-step implementation plan for each task is created later during task execution (Step 1 of `flowstate-task-execution` via `flowstate-writing-plans`). This process only scopes what each phase covers.

```
Read Entity & Spec -> Analyze Complexity -> Decompose Phases -> Approval
       (0)                  (1)                  (2)             (3)
                                                                  |
                                                                  v
           Verify & Summary <- Create Phase Tasks <- Create Milestone
                 (6)                  (5)                  (4)
```

### Entity Hierarchy

```
Project
└── Milestone (1 per design spec)
    ├── Task: Phase 1 (foundation)
    │   └── 10 sub-tasks (created during task-execution Step 0)
    ├── Task: Phase 2 (builds on Phase 1)
    │   └── 10 sub-tasks
    ├── Task: Phase 3
    │   └── 10 sub-tasks
    └── Task: Phase N
        └── 10 sub-tasks
```

---

## Prerequisites

Before starting:

- A project exists in FlowState with an approved design spec
- The design spec file exists at `docs/specs/YYYY-MM-DD-<topic>-design.md`
- The project has a linked FlowState document for the spec
- You have `orgId` and `workspaceId` from `.flowstate/config.json`

---

## Step 0: Read Config & Load Spec

**Who:** Assigned agent
**Pause:** No

### Actions

1. **Read `.flowstate/config.json` from the repository root** to obtain `orgId`, `workspaceId`, `codebaseId`:
   ```
   Read .flowstate/config.json -> extract orgId, workspaceId, codebaseId
   ```
   These IDs are NEVER guessed, inferred from project names, or recalled from memory. They must be read from the file.

2. **Run codebase audit** via `flowstate-codebase-audit` skill:
   - Run `flowstate audit . --format json`
   - If errors found, attempt auto-fix or block planning
   - Planning CANNOT proceed until audit passes (zero `MISSING_*` or `INVALID_*` errors)
   - This prevents plans from being written against stale or missing config

3. If a `projectId` is needed, read the package-level config:
   ```
   Read packages/<pkg>/.flowstate/config.json -> extract projectId
   ```

3. Fetch the project from FlowState using the real IDs:
   ```
   collection-get projects <project_id> orgId=<orgId from config>
   ```

4. Record `title`, `description` from the project (orgId and workspaceId already came from config)

5. Extract the design spec path from the project description (the `**Design Spec:**` reference added by brainstorming Step 8)

6. Read the design spec file from the filesystem

7. Check for deep-analysis synthesis documents linked to the project:
   ```
   document-search { query: "deep analysis synthesis", projectId: "<project_id>" }
   ```
8. If a synthesis document exists, load it as supplementary context alongside the design spec
9. The synthesis provides cross-cutting insights (consensus findings, contradictions, blind spots) that inform phase decomposition

10. Update project status to "In Progress":
   ```
   collection-update projects <project_id> { "status": "In Progress", "orgId": "<from config>" }
   ```

### Done when

- Config file read and orgId, workspaceId, codebaseId extracted
- Project context loaded (title, description)
- Design spec content loaded into agent context
- Project status is "In Progress"

---

## Step 1: Analyze Spec Complexity

**Who:** Assigned agent
**Pause:** No

### Actions

1. Read the full design spec and identify:
   - Major functional areas or subsystems
   - Dependencies between areas (what must be built first)
   - Shared infrastructure or prerequisites
   - Estimated scope per area (small, medium, large)

2. Determine phasing strategy based on:
   - **Dependency order:** Build foundations before features that depend on them
   - **Risk reduction:** High-risk or uncertain areas earlier
   - **Incremental value:** Each phase should produce something testable/usable
   - **Scope balance:** Phases should be roughly similar in effort

3. Build a dependency graph of the identified areas

### Done when

- Agent has identified the major functional areas
- Dependencies between areas are mapped
- A preliminary phase grouping is formed

---

## Step 2: Decompose into Phases

**Who:** Assigned agent
**Pause:** No

### Actions

1. Group the functional areas into ordered phases:
   - Phase 1 is always shared infrastructure, prerequisites, or foundations
   - Subsequent phases build on prior phases
   - Each phase has a clear goal and defined deliverables

2. For each phase, draft:
   - Phase title (e.g., "Phase 1: API Core Infrastructure")
   - Goal (one sentence)
   - Scope (what's in, what's not)
   - Deliverables (concrete outputs)
   - Dependencies (which prior phases must complete first)
   - Key files and acceptance criteria

3. Create a discussion on the project with the phase decomposition:
   ```
   collection-create discussions {
     entityType: "project",
     entityId: "<project_id>",
     content: "## Phase Decomposition\n\n<phase breakdown with goals and deliverables>",
     userName: "<agent characterName from metadata>",
     userId: "<agent teamMemberId from metadata>",
     orgId: "<orgId>",
     workspaceId: "<workspaceId>",
     threadDepth: 0,
     isEdited: false,
     isDeleted: false
   }
   ```

### Phase decomposition format

```markdown
## Phase Decomposition: <Project Title>

### Phase 1: <Title>

**Goal:** <one sentence>
**Scope:** <what's included>
**Deliverables:** <bullet list>
**Dependencies:** None (foundation phase)
**Key Files:** <paths that will be created or modified>
**Acceptance Criteria:** <how to verify this phase is done>

### Phase 2: <Title>

**Goal:** <one sentence>
**Scope:** <what's included>
**Deliverables:** <bullet list>
**Dependencies:** Phase 1
**Key Files:** <paths>
**Acceptance Criteria:** <verification>

...
```

### Done when

- Phases are defined with goals, scope, deliverables, and acceptance criteria
- Phase decomposition posted as a discussion on the project

---

## Step 3: Phase Decomposition Approval

**Who:** Assigned agent (requests), human (approves)
**Pause:** Yes

### Actions

1. Create an approval for the phase decomposition:
   ```
   collection-create approvals {
     projectId: "<project_id>",
     title: "Phase decomposition: <project title>",
     type: "planning-phase-decomposition",
     category: "planning",
     categoryName: "Planning",
     status: "pending",
     documentType: "phase-decomposition",
     documentContent: "<phase breakdown summary>",
     orgId: "<orgId>"
   }
   ```
2. **Pause.** Wait for approval response.
3. On resume:
   - If `approved`: proceed to Step 4
   - If `needs-revision`: read `comments`, revise decomposition, return to Step 2
   - If `rejected`: escalate or return to brainstorming

### Done when

- Phase decomposition approved
- Number of phases and their scope confirmed

---

## Step 4: Create Milestone

**Who:** Assigned agent
**Pause:** No

This step creates a **single milestone** for the entire design spec. All phases become tasks under this milestone.

### Actions

1. Create one milestone for the design:
   ```
   collection-create milestones {
     title: "<Design Title>",
     description: "**Goal:** <overall design goal>\n\n**Design Spec:** <spec file path>\n\n**Phases:** <N> phases planned",
     projectId: "<project_id>",
     status: "To Do",
     goalId: "design-implementation",
     sortOrder: 1,
     orgId: "<orgId>",
     workspaceId: "<workspaceId>",
     version: 1
   }
   ```
2. Record the milestone ID for use in Step 5

### Done when

- Single milestone exists in FlowState for the design
- Milestone ID recorded

---

## Step 5: Create Phase Tasks

**Who:** Assigned agent
**Pause:** No

This step creates one task per phase under the milestone. Each task's description includes the phase scope, deliverables, and acceptance criteria from Step 2. The detailed implementation plan is created later during task-execution Step 1 via `flowstate-writing-plans`.

### Actions

1. For each phase from the approved decomposition:
   ```
   collection-create tasks {
     title: "Phase <N>: <Phase Title>",
     description: "**Goal:** <phase goal>\n\n**Scope:**\n<what's included>\n\n**Deliverables:**\n<bullet list>\n\n**Dependencies:** <prior phases>\n\n**Key Files:**\n<file paths>\n\n**Acceptance Criteria:**\n<verification criteria>",
     status: "Planned",
     milestoneId: "<milestone_id>",
     projectId: "<project_id>",
     orgId: "<orgId>",
     workspaceId: "<workspaceId>",
     sortOrder: <N>,
     version: 1
   }
   ```
2. Record the created task IDs in order
3. Update the milestone description to list the created tasks:
   ```
   collection-update milestones <milestone_id> {
     "description": "<existing>\n\n## Tasks\n\n| # | Phase | Task ID |\n|---|-------|---------|\n| 1 | <title> | <task_id> |\n| 2 | <title> | <task_id> |\n...",
     "orgId": "<orgId>"
   }
   ```

### ID inheritance

- `orgId` and `workspaceId` come from `.flowstate/config.json`
- `projectId` comes from the project
- `milestoneId` is the milestone created in Step 4

### Done when

- All phase tasks created in FlowState with correct parent references
- Milestone description updated with task table
- Tasks are in "Planned" status ordered by `sortOrder`

---

## Step 6: Final Verification & Summary

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query tasks for the milestone to verify all were created:
   ```
   collection-query tasks { "milestoneId": "<milestone_id>", "orgId": "<orgId>" }
   ```
2. Verify each task has:
   - Goal, scope, and deliverables in description
   - Correct `sortOrder` matching phase number
   - `milestoneId` and `projectId` set

3. Create a summary discussion on the project:
   ```
   collection-create discussions {
     entityType: "project",
     entityId: "<project_id>",
     content: "## Planning Complete\n\n<N> phases planned under milestone `<milestone_id>`:\n\n| Phase | Task | Status |\n|-------|------|--------|\n| 1 | task_XXX | Planned |\n| 2 | task_YYY | Planned |\n...\n\nReady for execution. Each task will create its own implementation plan during task-execution Step 1.",
     userName: "<agent characterName from metadata>",
     userId: "<agent teamMemberId from metadata>",
     orgId: "<orgId>",
     workspaceId: "<workspaceId>",
     threadDepth: 0,
     isEdited: false,
     isDeleted: false
   }
   ```

4. Update the project description to include a planning summary:
   ```
   collection-update projects <project_id> {
     "description": "<existing>\n\n## Phases\n\n| Phase | Task | Description |\n|-------|------|-------------|\n| 1 | task_XXX | <title> |\n| 2 | task_YYY | <title> |\n...\n\nPlanning complete. Ready for execution via `flowstate-executing-multi-phase-plan`.",
     "orgId": "<orgId>"
   }
   ```

5. Transition: Proceed to `flowstate-executing-multi-phase-plan` to begin task execution.

### Done when

- All tasks verified under the milestone
- Summary discussion posted
- Project description updated with phase table
- Ready for `flowstate-executing-multi-phase-plan`

---

## FlowState Entity Map

| Step | Entity Type | Collection    | Purpose                           |
| ---- | ----------- | ------------- | --------------------------------- |
| 2    | Discussion  | `discussions` | Phase decomposition presentation  |
| 3    | Approval    | `approvals`   | Phase decomposition approval gate |
| 4    | Milestone   | `milestones`  | Single milestone for the design   |
| 5    | Task        | `tasks`       | One task per phase                |
| 6    | Discussion  | `discussions` | Planning completion summary       |

---

## Approval Workflow

This process uses the standard FlowState approval workflow. See `flowstate-approval-workflow` for the full pattern (creating approvals, response routing, pause/resume, revision loops).

### Planning Approval Types

| Type                  | Category   | When Used                     |
| --------------------- | ---------- | ----------------------------- |
| `phase-decomposition` | `planning` | Approving the phase breakdown |

---

## Process Diagram

```
+---------------------------------------------------------------------------+
|                     MULTI-PHASE PLANNING PROCESS                          |
|                                                                           |
|  +----------+   +----------+   +----------+   +----------+               |
|  | 0: Read  |-->| 1: Analyze-->| 2: Decompose->| 3: Approval             |
|  | Entity & |   | Complexity|   | into     |   | (pause)  |              |
|  | Spec     |   |           |   | Phases   |   |          |              |
|  +----------+   +----------+   +----------+   +----+-----+              |
|                                                      |                    |
|                                                      v                    |
|  +----------+   +----------+   +----------+                              |
|  | 6: Verify|<--| 5: Create|<--| 4: Create|                              |
|  | & Summary|   | Phase    |   | Milestone|                              |
|  |          |   | Tasks    |   | (single) |                              |
|  +----------+   +----------+   +----------+                              |
+---------------------------------------------------------------------------+
```

---

## How This Connects to Task Execution

Each phase task follows the standard 10-step lifecycle via `flowstate-task-execution`:

```
Phase Task (e.g., "Phase 1: CLI Package Foundation")
├── Step 0: Set task In Progress, create 10 sub-tasks
├── Step 1: Create implementation plan (via flowstate-writing-plans)
│            ^ This is where the detailed plan gets written
├── Step 2: Create worktree
├── Step 3: Execute development
├── Step 4: Update task with results
├── Step 5: Create PR into dev
├── Step 6: Code review
├── Step 7: Resolve review feedback
├── Step 8: Merge PR & cleanup
└── Step 9: Mark task complete
```

The phase task's description (goal, scope, deliverables, acceptance criteria) provides the input that `flowstate-writing-plans` uses to create the detailed implementation plan at Step 1.

---

## Error Handling

| Situation                                | Action                                                       |
| ---------------------------------------- | ------------------------------------------------------------ |
| Design spec not found at referenced path | Check project description for spec path, ask user if missing |
| Phase decomposition rejected             | Return to brainstorming or refine spec scope                 |
| Milestone creation fails                 | Check orgId/workspaceId, verify schema fields, retry         |
| Task creation fails                      | Check required fields (version >= 1), retry                  |
| Project missing orgId/workspaceId        | Fetch from `.flowstate/config.json`                          |

---

## Conventions

| Item                 | Convention                                             |
| -------------------- | ------------------------------------------------------ |
| Milestone title      | Design title (e.g., "Secure Deployment CLI")           |
| Milestone count      | 1 per design spec                                      |
| Task title           | `Phase <N>: <Phase Title>`                             |
| Task `sortOrder`     | Phase number (1, 2, 3...)                              |
| Task status          | "Planned" on creation                                  |
| Approval category    | `planning`                                             |
| Commit format        | Not applicable (no plan files created at this stage)   |
| Detailed plans       | Created per-task during task-execution Step 1          |

---

_Created: 2026-03-28_
_Revised: 2026-03-30 (phases as tasks under single milestone)_
