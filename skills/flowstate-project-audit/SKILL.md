---
name: flowstate-project-audit
description: Use when a project has specs and plans on disk but FlowState milestones and tasks are missing, stale, or out of sync with implementation status - maps spec/plan files to milestone and task records, creates missing entities, reconciles completion status with codebase reality.
---

# Project Audit Process

**Status:** Active
**Purpose:** Review a FlowState project within a workspace, reconcile its milestones and tasks against design specs and implementation plans on disk, and ensure all entities are accurately linked with correct completion status
**Scope:** Any project registered in a FlowState workspace that has specs and/or plans in the repository
**Trigger:** Project exists but milestones/tasks are missing, incomplete, or out of sync with spec/plan documents
**Input:** Project ID (`projectId`), workspace ID (`workspaceId`), organization ID (`orgId`), package path, specs directory, plans directory
**Output:** Milestones linked to specs, tasks linked to plans, completion status synced with codebase reality

---

## Overview

A project audit bridges the gap between design documents on disk and FlowState tracking entities. Specs and plans accumulate as development progresses, but FlowState milestones and tasks may not exist, may be stale, or may not reflect actual implementation status. This process scans the spec and plan directories, maps each document to the target project (or determines it doesn't apply), creates milestones for applicable specs, creates tasks for applicable plans, and updates completion status by inspecting the actual codebase.

This process operates on one project at a time. To audit an entire workspace, run this process for each project.

```
Read Config -> Query FlowState -> Scan Specs -> Scan Plans -> Map to Project
     (0)            (1)              (2)           (3)            (4)
                                                                   |
                                                                   v
    Report <- Update Status <- Create Tasks <- Create Milestones <- Link
     (9)          (8)             (7)              (6)              (5)
```

---

## Prerequisites

Before starting:

- The project is registered in FlowState (you have `projectId`, `workspaceId`, `orgId`)
- The package has a `.flowstate/config.json` with `orgId`, `workspaceId`, `codebaseId`, and `projectId` — see [flowstate-config.md](./flowstate-config.md)
- The repository has a `docs/specs/` directory (or equivalent)

**Schema references:** [object-hierarchy.md](./object-hierarchy.md) · [project-schema.md](./project-schema.md) · [milestone-schema.md](./milestone-schema.md) · [task-schema.md](./task-schema.md)

- The repository has a `docs/plans/` directory (or equivalent)
- You understand which package this project represents and what code it contains

---

## Step 0: Read Project Configuration

**Who:** Assigned agent
**Pause:** No

### Actions

1. Read the package `.flowstate/config.json`:
   - Extract `projectId`, `orgId`, `workspaceId`, `codebaseId`
   - Note `projectName` and `projectType`

2. Read the root `.flowstate/config.json`:
   - Get the repository URL
   - Get the specs and plans directory paths (default: `docs/specs/` and `docs/plans/`)

3. Read the package's `package.json`:
   - Extract `name`, `description`, `dependencies`, `devDependencies`
   - Note the NPM package name (used for matching in specs/plans)

4. List the package's source files to understand its scope:
   - What modules exist
   - What test files exist
   - What functionality is implemented

### Done when

- Project IDs confirmed
- Package name and scope understood
- Source file inventory captured

---

## Step 1: Query Existing FlowState State

**Who:** Assigned agent
**Pause:** No

### Actions

1. Fetch the project record:

   ```
   collection-get projects <projectId>
   ```

2. Query existing milestones for this project:

   ```
   collection-query milestones {
     "projectId": "<projectId>"
   }
   ```

3. Query existing tasks for this project:

   ```
   collection-query tasks {
     "projectId": "<projectId>"
   }
   ```

4. Query existing documents for this project:

   ```
   collection-query documents {
     "projectId": "<projectId>"
   }
   ```

5. Build the existing state map:

   | Entity     | Count | IDs  |
   | ---------- | ----- | ---- |
   | Milestones | N     | list |
   | Tasks      | N     | list |
   | Documents  | N     | list |

### Done when

- All existing milestones, tasks, and documents for the project are known
- Duplicates can be avoided in later steps

---

## Step 2: Scan Design Specs

**Who:** Assigned agent
**Pause:** No

### Actions

1. List all spec files in the specs directory:

   ```bash
   ls docs/specs/*.md
   ```

2. For each spec file, read the header (first 50-100 lines) to extract:
   - Title (first H1)
   - Status (Draft, Approved, etc.)
   - Scope description
   - Package/project references (look for NPM package names, directory paths, import statements)
   - Phase breakdown (if the spec defines multiple phases)

3. Determine applicability to the target project:

   | Signal                                          | Applies?        |
   | ----------------------------------------------- | --------------- |
   | Spec's primary package matches this project     | Yes - primary   |
   | Spec lists this package as a dependency it uses | Yes - secondary |
   | Spec mentions this package in import examples   | Yes - secondary |
   | Spec targets a different package entirely       | No              |

4. Classify each spec:

   | Category    | Description                                 |
   | ----------- | ------------------------------------------- |
   | `primary`   | This spec defines work FOR this project     |
   | `secondary` | This spec uses this project as a dependency |
   | `unrelated` | This spec doesn't involve this project      |

5. Build the spec mapping:

   | Spec File | Title | Category                    | Phase Count |
   | --------- | ----- | --------------------------- | ----------- |
   | `file.md` | Title | primary/secondary/unrelated | N           |

### Done when

- Every spec file categorized
- Primary and secondary specs identified for this project

---

## Step 3: Scan Implementation Plans

**Who:** Assigned agent
**Pause:** No

### Actions

1. List all plan files in the plans directory:

   ```bash
   ls docs/plans/*.md
   ```

2. For each plan file, read the header (first 50-100 lines) to extract:
   - Title (first H1)
   - Which spec it implements (if referenced)
   - Package/project references
   - Phase number (if applicable)
   - File paths it modifies (look for `packages/<pkg>/src/` paths)
   - Completion indicators (checkboxes, status markers)

3. Determine applicability using the same signals as Step 2, plus:

   | Signal                                          | Applies? |
   | ----------------------------------------------- | -------- |
   | Plan modifies files in this package's directory | Yes      |
   | Plan's commit messages reference this package   | Yes      |
   | Plan creates/modifies this package's tests      | Yes      |

4. For applicable plans, assess completion status by comparing against the codebase:
   - Do the files the plan creates/modifies exist?
   - Do the test files exist and contain the expected test cases?
   - Are the exports present in the package's index.ts?

5. Assign a status:

   | Status        | Criteria                                      |
   | ------------- | --------------------------------------------- |
   | `Complete`    | All files exist, tests exist, exports present |
   | `In Progress` | Some files exist, partial implementation      |
   | `To Do`       | No implementation found in codebase           |
   | `Blocked`     | Dependencies not yet implemented              |

6. Build the plan mapping:

   | Plan File | Title | Spec Reference | Status                     | Phase |
   | --------- | ----- | -------------- | -------------------------- | ----- |
   | `file.md` | Title | spec-file.md   | Complete/In Progress/To Do | N     |

### Done when

- Every plan file categorized and status assessed
- Applicable plans identified with completion status

---

## Step 4: Map Documents to Project

**Who:** Assigned agent
**Pause:** No

### Actions

1. For specs categorized as `primary`:
   - Each becomes a milestone candidate
   - If the spec defines multiple phases, each phase becomes a separate milestone

2. For specs categorized as `secondary`:
   - Create a single milestone representing this project's role as a dependency
   - Group related secondary references under it

3. For applicable plans:
   - Each plan becomes a task candidate
   - Link each task to its parent milestone (via the spec it implements)
   - Plans without a parent spec get linked to the appropriate functional milestone

4. Handle orphan plans (plans that apply to this project but don't reference a spec):
   - Group by functional area
   - Create a milestone for the functional area if one doesn't exist

5. Produce the mapping table:

   | Milestone (from Spec)         | Tasks (from Plans) | Status |
   | ----------------------------- | ------------------ | ------ |
   | Spec title or functional area | Plan 1, Plan 2     | Mixed  |

### Done when

- Every applicable spec mapped to a milestone
- Every applicable plan mapped to a task with parent milestone
- No orphan plans without a milestone

---

## Step 5: Link Specs and Plans

**Who:** Assigned agent
**Pause:** No

### Actions

1. For each spec-to-milestone mapping, check if a milestone already exists:
   - Match by name or title
   - If exists, record the existing milestone ID
   - If not, flag for creation in Step 6

2. For each plan-to-task mapping, check if a task already exists:
   - Match by name or title
   - If exists, record the existing task ID
   - If not, flag for creation in Step 7

3. Identify stale entities:
   - Milestones that exist in FlowState but have no matching spec
   - Tasks that exist in FlowState but have no matching plan

4. Build the action plan:

   | Action | Entity                         | Source              |
   | ------ | ------------------------------ | ------------------- |
   | Create | Milestone: "Title"             | spec-file.md        |
   | Create | Task: "Title"                  | plan-file.md        |
   | Update | Task: task_XXX status          | codebase inspection |
   | Flag   | Milestone: mile_XXX (orphaned) | no matching spec    |

### Done when

- Complete action plan built
- No ambiguous mappings

---

## Step 6: Create Milestones

**Who:** Assigned agent
**Pause:** No

### Actions

1. For each milestone to create:

   ```
   collection-create milestones {
     name: "<kebab-case-spec-name>",
     title: "<Spec Title>",
     description: "<Spec purpose and scope. Lists which plans/tasks belong to this milestone.>",
     status: "<Complete|In Progress|To Do>",
     projectId: "<projectId>",
     orgId: "<orgId>",
     workspaceId: "<workspaceId>",
     goalId: "",
     version: 1,
     sortOrder: <N>,
     archived: false,
     metadata: {
       specFile: "<relative-path-to-spec>",
       specStatus: "<Draft|Approved>"
     }
   }
   ```

2. Milestone status is derived from its tasks:

   | Task Statuses          | Milestone Status |
   | ---------------------- | ---------------- |
   | All Complete           | Complete         |
   | Any In Progress        | In Progress      |
   | All To Do              | To Do            |
   | Mixed Complete + To Do | In Progress      |

3. Record each generated milestone ID

4. Create milestones in parallel batches of 5

### Milestone fields

| Field               | Source                                   | Required |
| ------------------- | ---------------------------------------- | -------- |
| `name`              | kebab-case from spec file name           | Yes      |
| `title`             | Spec title (first H1)                    | Yes      |
| `description`       | Spec purpose + scope + task list         | Yes      |
| `status`            | Derived from task statuses               | Yes      |
| `projectId`         | From config                              | Yes      |
| `goalId`            | Empty string (link later if goal exists) | Yes      |
| `version`           | 1                                        | Yes      |
| `sortOrder`         | Sequential                               | Yes      |
| `metadata.specFile` | Relative path to spec                    | No       |

### Done when

- All milestones created
- Milestone IDs recorded for task linking

---

## Step 7: Create Tasks

**Who:** Assigned agent
**Pause:** No

### Actions

1. For each task to create:

   ```
   collection-create tasks {
     name: "<kebab-case-plan-name>",
     title: "<Plan Title>",
     description: "<Plan purpose. Files modified. Key implementation details.>",
     status: "<Complete|In Progress|To Do|Blocked>",
     completed: <true|false>,
     projectId: "<projectId>",
     milestoneId: "<milestoneId>",
     orgId: "<orgId>",
     workspaceId: "<workspaceId>",
     version: 1,
     priority: 2,
     sortOrder: <N>,
     archived: false,
     metadata: {
       planFile: "<relative-path-to-plan>",
       specFile: "<relative-path-to-parent-spec>",
       phase: "<phase-number-if-applicable>"
     }
   }
   ```

2. Task status mapping:

   | Codebase State              | Task Status | completed |
   | --------------------------- | ----------- | --------- |
   | All files exist, tests pass | Complete    | true      |
   | Partial implementation      | In Progress | false     |
   | No implementation found     | To Do       | false     |
   | Dependency not ready        | Blocked     | false     |

3. Create tasks in parallel batches of 5

### Done when

- All tasks created with correct milestone linkage
- Task statuses reflect codebase reality

---

## Step 8: Update Completion Status

**Who:** Assigned agent
**Pause:** No

### Actions

1. For existing tasks found in Step 1 that need status updates:

   ```
   collection-update tasks <taskId> {
     status: "<new-status>",
     completed: <true|false>
   }
   ```

2. For existing milestones that need status updates based on updated task statuses:

   ```
   collection-update milestones <milestoneId> {
     status: "<new-status>"
   }
   ```

3. Update the project status if all milestones are complete:
   ```
   collection-update projects <projectId> {
     status: "<In Progress|Complete>"
   }
   ```

### Done when

- All entity statuses reflect current codebase state
- Project status updated if applicable

---

## Step 9: Report Audit Summary

**Who:** Assigned agent
**Pause:** No

### Actions

1. Generate the audit report:

   ```
   Project Audit Complete:
     Project:    <projectId> (<project title>)
     Package:    <package-name>
     Workspace:  <workspaceId>

     Specs scanned:     <total>
     Specs applicable:  <primary + secondary count>
     Plans scanned:     <total>
     Plans applicable:  <applicable count>

     Milestones:
       Created:  <N>
       Updated:  <N>
       Existing: <N>

     Tasks:
       Created:  <N>  (Complete: X, In Progress: Y, To Do: Z)
       Updated:  <N>
       Existing: <N>

     | Milestone | Status | Tasks | Complete | In Progress | To Do |
     |-----------|--------|-------|----------|-------------|-------|
     | Title     | Status | N     | X        | Y           | Z     |
   ```

2. Flag any issues found:
   - Orphaned milestones (no matching spec)
   - Orphaned tasks (no matching plan)
   - Specs with no implementation plans
   - Plans that reference nonexistent packages

### Done when

- Audit report generated and displayed
- All issues flagged

---

## Spec-to-Milestone Mapping Rules

How to determine if a spec creates a milestone for a given project:

| Rule                                                           | Example                                                                      |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Spec's primary target package matches project                  | `saga-directory-design.md` -> `proj_4HUZfWRpHh` (saga-directory)             |
| Spec defines phases, each phase targets this package           | `encrypted-replication-phases.md` Phase 1 -> `proj_eGrBvO5hgG` (saga-crypto) |
| Spec defines a cross-cutting feature with work in this package | `llm-chat-feature-design.md` -> both server and saga-app projects            |

When a spec targets multiple packages, create a milestone in each affected project with the same spec reference but project-specific description.

## Plan-to-Task Mapping Rules

How to determine if a plan creates a task for a given project:

| Rule                                               | Example                                                                 |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| Plan modifies files under this package's directory | `phase1-chat-crud.md` modifies `packages/server/src/` -> server project |
| Plan's commit messages scope to this package       | `feat(saga-crypto): add KeyRing` -> saga-crypto project                 |
| Plan creates tests for this package                | `chain.test.ts` in `packages/client/` -> client project                 |

When a plan touches multiple packages, create a task in each affected project.

---

## Completion Status Assessment

How to determine if work described in a plan is complete:

| Check                  | Method                                                                |
| ---------------------- | --------------------------------------------------------------------- |
| Files exist            | Glob for the file paths listed in the plan                            |
| Exports present        | Read the package's `index.ts` and check for expected exports          |
| Tests exist            | Glob for test files referenced in the plan                            |
| Tests pass             | Run the package's test suite (optional, only if explicitly requested) |
| Dependencies satisfied | Check that imported packages exist in `package.json`                  |

A task is `Complete` when all checks pass. A single failing check makes it `In Progress` at best.

---

## Idempotency

This process is safe to run multiple times:

| Scenario                          | Behavior                                 |
| --------------------------------- | ---------------------------------------- |
| Milestone already exists for spec | Skip creation, verify status             |
| Task already exists for plan      | Skip creation, update status if changed  |
| New spec added since last audit   | Create new milestone                     |
| New plan added since last audit   | Create new task                          |
| Code completed since last audit   | Update task to Complete                  |
| Code reverted since last audit    | Update task back to In Progress or To Do |

---

## Error Handling

| Situation                              | Action                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| Package config missing                 | Error: run workspace-codebase-audit first                                    |
| No specs directory                     | Warn: no design specs found, create milestones from functional areas instead |
| No plans directory                     | Warn: no implementation plans found, create tasks from codebase inspection   |
| Spec references unknown package        | Skip for this project, flag in report                                        |
| Plan references files that don't exist | Mark task as To Do                                                           |
| Milestone creation fails               | Check projectId, verify project exists                                       |
| Task creation fails                    | Check milestoneId, verify milestone exists                                   |

---

## Conventions

| Item              | Convention                                                       |
| ----------------- | ---------------------------------------------------------------- |
| Milestone name    | kebab-case derived from spec file name                           |
| Task name         | kebab-case derived from plan file name or functional description |
| Spec directory    | `docs/specs/` (configurable)                                     |
| Plans directory   | `docs/plans/` (configurable)                                     |
| Status values     | `Complete`, `In Progress`, `To Do`, `Blocked`                    |
| Batch size        | 5 parallel operations for milestones and tasks                   |
| Spec metadata key | `metadata.specFile` on milestones                                |
| Plan metadata key | `metadata.planFile` on tasks                                     |

---

_Created: 2026-03-28_
