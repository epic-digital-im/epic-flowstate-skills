---
name: flowstate-task-schema
description: Use when creating FlowState tasks, running the mandatory pre-flight hierarchy check, setting task execution metadata, or creating subtasks - provides task collection schema, status values, the 5-step pre-flight check, and full/minimal creation templates. See flowstate-pre-flight-check for the standalone check procedure.
---

# Task Schema

**Status:** Active
**Collection:** `tasks`
**ID Prefix:** `task_`
**Hierarchy Level:** 5 (leaf node)
**Parent Required:** `org` → `orgId`, `project` → `projectId`, `milestone` → `milestoneId`

---

## Overview

A **task** is the atomic unit of work in FlowState. Every piece of implementation work is a task. Tasks must belong to both a **project** and a **milestone** — creating a task without these parents is not allowed.

Before creating a task, the full hierarchy must exist:

```
Org  ✓ (verify orgId)
└── Workspace  ✓ (verify workspaceId)
    └── Project  ✓ (verify projectId — create if missing)
        └── Milestone  ✓ (verify milestoneId — create if missing)
            └── Task  ← this document (create here)
```

**See also:** [task-execution-process.md](./task-execution-process.md) for the full task lifecycle.

---

## Schema

### Required Fields

| Field       | Type    | Description                 | Example               |
| ----------- | ------- | --------------------------- | --------------------- |
| `id`        | string  | Auto-generated primary key  | `task_abc123xyz0`     |
| `orgId`     | string  | Parent organization ID      | `org_9f3omFEY2H`      |
| `title`     | string  | Human-readable task title   | `Implement CLI parse` |
| `archived`  | boolean | Whether task is archived    | `false`               |
| `version`   | number  | Schema version              | `1`                   |
| `createdAt` | string  | ISO 8601 creation timestamp | `2025-01-01T00:00Z`   |
| `updatedAt` | string  | ISO 8601 modified timestamp | `2025-01-01T00:00Z`   |

### Optional Fields (Strongly Recommended)

These fields are optional in the schema but **required by convention** for any properly linked task:

| Field         | Type   | Description                                      |
| ------------- | ------ | ------------------------------------------------ |
| `workspaceId` | string | Parent workspace ID                              |
| `projectId`   | string | Parent project ID (**required by convention**)   |
| `milestoneId` | string | Parent milestone ID (**required by convention**) |

### All Optional Fields

| Field             | Type     | Description                                            |
| ----------------- | -------- | ------------------------------------------------------ |
| `userId`          | string   | Creator user ID                                        |
| `name`            | string   | Kebab-case identifier                                  |
| `description`     | string   | Task description (max 5000 chars)                      |
| `status`          | string   | `todo`, `in_progress`, `In Progress`, `Complete`, etc. |
| `type`            | string   | Task type classification                               |
| `completed`       | boolean  | Whether task is complete                               |
| `completedAt`     | string   | ISO 8601 completion date                               |
| `startAt`         | string   | Planned start date (ISO 8601)                          |
| `startedAt`       | string   | Actual start date (ISO 8601)                           |
| `dueAt`           | string   | Due date (ISO 8601)                                    |
| `parentTaskId`    | string   | Parent task ID (for subtasks)                          |
| `priority`        | number   | Priority 0–4 (0=none, 4=urgent)                        |
| `assigneeId`      | string   | Assigned user/agent ID                                 |
| `estimatePoints`  | number   | Story points 0–10000 (0.5 increments)                  |
| `sortOrder`       | number   | Display order within milestone (0–999999)              |
| `timeBudgetHours` | number   | Time budget in hours                                   |
| `tagIds`          | string[] | Linked tag IDs                                         |
| `metadata`        | object   | Custom metadata (see below)                            |
| `extended`        | object   | Extended data                                          |

### Metadata Fields (`TaskMetadata`)

| Field                 | Type     | Description                                   |
| --------------------- | -------- | --------------------------------------------- |
| `executionType`       | string   | `local` or `remote`                           |
| `prompt`              | string   | Agent prompt for task execution               |
| `leverage`            | string[] | Key leverage points for the task              |
| `requirements`        | string[] | Technical requirements list                   |
| `assignedAgent`       | string   | Agent name assigned to execute                |
| `executionAttempts`   | number   | Number of execution attempts                  |
| `lastExecutionError`  | string   | Last error message if execution failed        |
| `conversationState`   | object   | Conversation state for agent execution        |
| `conversationHistory` | array    | `[{role, content, timestamp}]` turn history   |
| `timeEntryIds`        | string[] | Associated time entry IDs                     |
| `totalTimeSeconds`    | number   | Total tracked time                            |
| `logIds`              | string[] | Associated log entry IDs                      |
| `createdByMCP`        | boolean  | Whether created via MCP tool                  |
| `taskNumber`          | string   | Human-readable task number (e.g., `T-42`)     |
| `parentTaskNumber`    | string   | Parent task number (for subtasks)             |
| `markdownStatus`      | string   | `[ ]`, `[-]`, or `[x]` for markdown rendering |
| `promptSections`      | array    | `[{key, value}]` structured prompt sections   |
| `planFile`            | string   | Relative path to implementation plan file     |
| `specFile`            | string   | Relative path to spec file                    |
| `phase`               | string   | Phase number or name                          |

### Collection Indexes

| Index                            | Purpose                         |
| -------------------------------- | ------------------------------- |
| `orgId + createdAt`              | List tasks for an org           |
| `workspaceId + createdAt`        | List for a workspace            |
| `projectId + createdAt`          | List tasks for a project        |
| `milestoneId + createdAt`        | List tasks for a milestone      |
| `parentTaskId + createdAt`       | List subtasks                   |
| `orgId + assigneeId + createdAt` | Tasks by assignee               |
| `orgId + status + priority`      | Filter by status + priority     |
| `milestoneId + sortOrder`        | Ordered list within a milestone |

---

## Task Status Values

| Status        | Meaning                            | `completed` |
| ------------- | ---------------------------------- | ----------- |
| `To Do`       | Not yet started                    | `false`     |
| `In Progress` | Currently being worked on          | `false`     |
| `Blocked`     | Cannot proceed, dependency missing | `false`     |
| `Complete`    | Work is done and verified          | `true`      |
| `Cancelled`   | Will not be done                   | `false`     |

When `completed = true`, also set `completedAt` to current ISO timestamp.

---

## Pre-Flight Hierarchy Check

**This check is mandatory before creating any task.** Run it in order:

### Step 1: Verify Org

```
collection-get orgs <orgId>
→ if 404: error — invalid orgId, check .flowstate/config.json
```

### Step 2: Verify Workspace

```
collection-get workspaces <workspaceId>
→ if 404: create workspace (see workspace-schema.md)
          write workspaceId to .flowstate/config.json
```

### Step 3: Verify Project

```
collection-get projects <projectId>
→ if 404: create project with same ID if projectId exists in config
          OR create new project if projectId is missing from config
          write projectId to package .flowstate/config.json
          commit config
```

### Step 4: Verify Milestone

```
collection-query milestones { projectId, name: <group-name> }
→ if empty: create milestone
            record milestoneId
```

### Step 5: Create Task

```
collection-create tasks {
  title: "<Task Title>",
  description: "<What needs to be done and how>",
  status: "To Do",
  completed: false,
  archived: false,
  version: 1,
  projectId: "<projectId>",
  milestoneId: "<milestoneId>",
  orgId: "<orgId>",
  workspaceId: "<workspaceId>",
  priority: 2,
  sortOrder: <N>
}
```

---

## Creating a Task

### Minimal Valid Task

```
collection-create tasks {
  title: "<Task Title>",
  archived: false,
  version: 1,
  orgId: "<orgId>",
  projectId: "<projectId>",
  milestoneId: "<milestoneId>",
  workspaceId: "<workspaceId>"
}
```

### Full Task With Execution Metadata

```
collection-create tasks {
  name: "<kebab-case-name>",
  title: "<Task Title>",
  description: "<Detailed description of what to implement>",
  status: "To Do",
  completed: false,
  archived: false,
  version: 1,
  projectId: "<projectId>",
  milestoneId: "<milestoneId>",
  orgId: "<orgId>",
  workspaceId: "<workspaceId>",
  priority: 2,
  sortOrder: <N>,
  metadata: {
    prompt: "<agent execution prompt>",
    requirements: ["<req1>", "<req2>"],
    planFile: "<relative-path-to-plan>",
    specFile: "<relative-path-to-spec>"
  }
}
```

---

## Dependency Chain

Before creating a task, the full hierarchy must be confirmed and created if missing:

| Level | Dependency | Check                                     | Create If Missing                            |
| ----- | ---------- | ----------------------------------------- | -------------------------------------------- |
| 1     | Org        | `collection-get orgs <orgId>`             | [org-schema.md](./org-schema.md)             |
| 2     | Workspace  | `collection-get workspaces <workspaceId>` | [workspace-schema.md](./workspace-schema.md) |
| 3     | Codebase   | `collection-get codebases <codebaseId>`   | [codebase-schema.md](./codebase-schema.md)   |
| 4     | Project    | `collection-get projects <projectId>`     | [project-schema.md](./project-schema.md)     |
| 5     | Milestone  | `collection-get milestones <milestoneId>` | [milestone-schema.md](./milestone-schema.md) |
| 6     | **Task**   | Create here                               | —                                            |

---

## Subtasks

Tasks can have subtasks via `parentTaskId`:

```
collection-create tasks {
  title: "<Subtask Title>",
  parentTaskId: "<parent-task-id>",
  projectId: "<same-projectId>",
  milestoneId: "<same-milestoneId>",
  orgId: "<orgId>",
  workspaceId: "<workspaceId>",
  archived: false,
  version: 1,
  metadata: {
    parentTaskNumber: "<parent-task-number>"
  }
}
```

Subtasks must have the **same `projectId` and `milestoneId`** as their parent.

---

## Error Handling

| Situation                                  | Action                                                      |
| ------------------------------------------ | ----------------------------------------------------------- |
| Task creation fails: `projectId` invalid   | Run pre-flight check step 3                                 |
| Task creation fails: `milestoneId` invalid | Run pre-flight check step 4                                 |
| Task status not updating                   | Check `completed` boolean matches status                    |
| Orphaned tasks (no milestone)              | Query tasks with `{ projectId, milestoneId: null }`, assign |
| Duplicate task                             | Query by title+projectId before creating                    |
| subtask missing milestone                  | Inherit parent's `milestoneId`                              |

---

## Conventions

| Item                         | Convention                                               |
| ---------------------------- | -------------------------------------------------------- |
| Task ID format               | `task_XXXXX` (auto-generated)                            |
| Task name                    | kebab-case derived from title or plan filename           |
| Both projectId + milestoneId | Required by convention even though schema marks optional |
| Priority default             | `2` (medium)                                             |
| Initial status               | `To Do`                                                  |
| Plan linkage                 | Store plan file path in `metadata.planFile`              |
| Spec linkage                 | Store spec file path in `metadata.specFile`              |
| Batch creation               | Create in batches of 5 when bulk-creating                |
| Status sync                  | When task completes, update parent milestone status      |

---

_Created: 2026-03-29_
