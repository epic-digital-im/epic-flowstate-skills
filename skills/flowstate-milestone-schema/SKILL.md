---
name: flowstate-milestone-schema
description: Use when creating milestones, deriving milestone status from tasks, linking spec files to FlowState tracking, or understanding milestone-task relationships - provides milestone collection schema, status derivation rules, goalId conventions, and creation commands.
---

# Milestone Schema

**Status:** Active
**Collection:** `milestones`
**ID Prefix:** `mile_`
**Hierarchy Level:** 4
**Parent Required:** `org` → `orgId`, `project` → `projectId`

---

## Overview

A **milestone** groups related tasks under a single goal or phase of work. Every task must belong to a milestone. Milestones belong to a project and represent a meaningful chunk of deliverable work — typically corresponding to a design spec, a phase, or a major feature.

```
Org
└── Workspace
    └── Project  ← parent
        └── Milestone  ← this document
            └── Task
```

---

## Schema

### Required Fields

| Field       | Type    | Description                       | Example              |
| ----------- | ------- | --------------------------------- | -------------------- |
| `id`        | string  | Auto-generated primary key        | `mile_abc123xyz0`    |
| `orgId`     | string  | Parent organization ID            | `org_9f3omFEY2H`     |
| `projectId` | string  | Parent project ID                 | `proj_HpfQyaJBl5`    |
| `goalId`    | string  | Linked goal ID (use `""` if none) | `""` or `goal_XXXXX` |
| `title`     | string  | Human-readable display name       | `CLI Command System` |
| `completed` | boolean | Whether milestone is complete     | `false`              |
| `archived`  | boolean | Whether milestone is archived     | `false`              |
| `version`   | number  | Schema version                    | `1`                  |
| `createdAt` | string  | ISO 8601 creation timestamp       | `2025-01-01T00:00Z`  |
| `updatedAt` | string  | ISO 8601 modified timestamp       | `2025-01-01T00:00Z`  |

### Optional Fields

| Field             | Type     | Description                                |
| ----------------- | -------- | ------------------------------------------ |
| `workspaceId`     | string   | Parent workspace ID (strongly recommended) |
| `userId`          | string   | Creator user ID                            |
| `name`            | string   | Kebab-case identifier                      |
| `description`     | string   | Milestone description (max 5000 chars)     |
| `status`          | string   | `To Do`, `In Progress`, `Complete`         |
| `sortOrder`       | number   | Display order within project (0–999999)    |
| `startAt`         | string   | Planned start date (ISO 8601)              |
| `dueAt`           | string   | Planned due date (ISO 8601)                |
| `completedAt`     | string   | Actual completion date (ISO 8601)          |
| `timeBudgetHours` | number   | Time budget in hours                       |
| `tagIds`          | string[] | Linked tag IDs                             |
| `metadata`        | object   | Custom metadata (see below)                |
| `extended`        | object   | Extended data                              |

### Metadata Fields (`MilestoneMetadata`)

| Field            | Type    | Values                                                    |
| ---------------- | ------- | --------------------------------------------------------- |
| `phaseType`      | string  | `requirements`, `design`, `tasks`, `implementation`       |
| `documentPath`   | string  | Path to the spec or plan file this milestone came from    |
| `approvalStatus` | string  | `pending`, `approved`, `rejected`                         |
| `approvedBy`     | string  | User ID who approved                                      |
| `approvedAt`     | string  | ISO 8601 approval timestamp                               |
| `createdByMCP`   | boolean | Whether created via MCP tool                              |
| `workflowData`   | object  | Approval workflow state (documentContent, approved, etc.) |
| `specFile`       | string  | Relative path to spec file (used by project-audit)        |

### Collection Indexes

| Index                             | Purpose                       |
| --------------------------------- | ----------------------------- |
| `orgId + createdAt`               | List milestones for an org    |
| `orgId + workspaceId + createdAt` | List for org+workspace        |
| `workspaceId + createdAt`         | List for a workspace          |
| `projectId + createdAt`           | List milestones for a project |
| `projectId + sortOrder`           | Ordered list within a project |

---

## Milestone Status Rules

A milestone's status is derived from the status of its tasks:

| Task Statuses               | Milestone Status |
| --------------------------- | ---------------- |
| All tasks `Complete`        | `Complete`       |
| Any task `In Progress`      | `In Progress`    |
| Mix of `Complete` + `To Do` | `In Progress`    |
| All tasks `To Do`           | `To Do`          |
| No tasks yet                | `To Do`          |

Update milestone status whenever task statuses change.

---

## Linking Rules

### What a Milestone Needs

Every milestone must be linked to:

- `orgId` — from `.flowstate/config.json`
- `projectId` — from package `.flowstate/config.json`
- `workspaceId` — from `.flowstate/config.json` (recommended)

### Pre-Flight Check

Before creating tasks, verify the milestone exists:

```
collection-get milestones <milestoneId>
```

Before creating a milestone, verify its project exists:

```
collection-get projects <projectId>
```

---

## Creating a Milestone

```
collection-create milestones {
  name: "<kebab-case-milestone-name>",
  title: "<Milestone Title>",
  description: "<What this milestone delivers. Which tasks it contains.>",
  status: "To Do",
  completed: false,
  archived: false,
  version: 1,
  projectId: "<projectId>",
  goalId: "",
  sortOrder: <N>,
  orgId: "<orgId>",
  workspaceId: "<workspaceId>",
  metadata: {
    specFile: "<relative-path-to-spec-if-applicable>"
  }
}
```

---

## Dependency Chain

Before creating a milestone, confirm:

| Dependency | Check                                     | Create If Missing                            |
| ---------- | ----------------------------------------- | -------------------------------------------- |
| Org        | `collection-get orgs <orgId>`             | [org-schema.md](./org-schema.md)             |
| Workspace  | `collection-get workspaces <workspaceId>` | [workspace-schema.md](./workspace-schema.md) |
| Project    | `collection-get projects <projectId>`     | [project-schema.md](./project-schema.md)     |

---

## Create-If-Missing Logic

When a task needs a milestone and none exists:

```
1. Check if a milestone exists for this logical grouping:
   collection-query milestones { projectId: <id>, name: <name> }
   → if found: use its milestoneId
   → if NOT found: create it (above)
2. When creating: set status = "To Do", completed = false
3. Update milestone status after all tasks are created
```

---

## Error Handling

| Situation                                | Action                                                |
| ---------------------------------------- | ----------------------------------------------------- |
| Task creation fails: invalid milestoneId | Verify milestone exists, create if missing            |
| Milestone has wrong `projectId`          | Update milestone record with correct projectId        |
| Milestone missing `goalId`               | Use `""` — goalId is required but can be empty string |
| Milestone status out of sync             | Re-derive from task statuses, update milestone        |
| No milestones in project                 | Create a default milestone before creating tasks      |

---

## Conventions

| Item                 | Convention                                             |
| -------------------- | ------------------------------------------------------ |
| Milestone ID format  | `mile_XXXXX` (auto-generated)                          |
| Milestone name       | kebab-case derived from spec or feature name           |
| Default goalId       | `""` (empty string) when no goal is linked             |
| Status initial value | `To Do`                                                |
| Sorting              | `sortOrder` 0-based integer, sequential within project |
| Spec linkage         | Store spec file path in `metadata.specFile`            |
| Tasks required       | At least one task should be created for each milestone |

---

_Created: 2026-03-29_
