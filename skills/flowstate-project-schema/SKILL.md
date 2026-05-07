---
name: flowstate-project-schema
description: Use when creating FlowState projects for monorepo packages, verifying projectId in package configs, restoring deleted project records, or understanding the 1-per-package rule - provides project collection schema, monorepo mapping rules, and create-if-missing logic.
---

# Project Schema

**Status:** Active
**Collection:** `projects`
**ID Prefix:** `proj_`
**Hierarchy Level:** 3
**Parent Required:** `org` → `orgId`, `workspace` → `workspaceId`

---

## Overview

A **project** is the unit of work tracking in FlowState. Every milestone and task must belong to a project. In a monorepo, **each package gets its own project record** — the project maps 1:1 to a package and its `projectId` is stored in the package-level `.flowstate/config.json`.

```
Org
└── Workspace
    └── Codebase  ← optional link via codebaseId
    └── Project  ← this document (1 per package in a monorepo)
        └── Milestone
            └── Task
```

---

## Schema

### Required Fields

| Field       | Type    | Description                 | Example             |
| ----------- | ------- | --------------------------- | ------------------- |
| `id`        | string  | Auto-generated primary key  | `proj_HpfQyaJBl5`   |
| `orgId`     | string  | Parent organization ID      | `org_9f3omFEY2H`    |
| `title`     | string  | Human-readable display name | `FlowState CLI`     |
| `completed` | boolean | Whether project is complete | `false`             |
| `archived`  | boolean | Whether project is archived | `false`             |
| `version`   | number  | Schema version              | `1`                 |
| `createdAt` | string  | ISO 8601 creation timestamp | `2025-01-01T00:00Z` |
| `updatedAt` | string  | ISO 8601 modified timestamp | `2025-01-01T00:00Z` |

### Optional Fields

| Field             | Type     | Description                                |
| ----------------- | -------- | ------------------------------------------ |
| `workspaceId`     | string   | Parent workspace ID (strongly recommended) |
| `userId`          | string   | Creator user ID                            |
| `name`            | string   | Kebab-case identifier                      |
| `description`     | string   | Project description (max 5000 chars)       |
| `status`          | string   | `active`, `In Progress`, `Complete`        |
| `sortOrder`       | number   | Display order within workspace             |
| `goalId`          | string   | Linked goal ID                             |
| `codebaseId`      | string   | Linked codebase ID                         |
| `startAt`         | string   | Planned start date (ISO 8601)              |
| `dueAt`           | string   | Planned due date (ISO 8601)                |
| `completedAt`     | string   | Actual completion date (ISO 8601)          |
| `timeBudgetHours` | number   | Time budget in hours                       |
| `tagIds`          | string[] | Linked tag IDs                             |
| `metadata`        | object   | Custom metadata (see below)                |
| `extended`        | object   | Extended data                              |

### Metadata Fields (`ProjectMetadata`)

| Field          | Type    | Values                                              |
| -------------- | ------- | --------------------------------------------------- |
| `specType`     | string  | `feature`, `bugfix`, `refactor`                     |
| `phase`        | string  | `requirements`, `design`, `tasks`, `implementation` |
| `createdByMCP` | boolean | Whether created via MCP tool                        |
| `mcpVersion`   | string  | MCP version that created the project                |

### Collection Indexes

| Index                        | Purpose                       |
| ---------------------------- | ----------------------------- |
| `orgId + createdAt`          | List projects for an org      |
| `orgId + status + createdAt` | Filter by status              |
| `workspaceId + createdAt`    | List projects for a workspace |
| `goalId + createdAt`         | List projects for a goal      |

---

## Monorepo Project Rules

In a monorepo, **each package has its own project**. This is mandatory.

### Package → Project Mapping

```
epic-flowstate/                          ← monorepo root (no projectId)
├── .flowstate/config.json               ← orgId, workspaceId, codebaseId only
└── packages/
    ├── flowstate-cli/
    │   └── .flowstate/config.json       ← + projectId: "proj_HpfQyaJBl5"
    ├── flowstate-mcp/
    │   └── .flowstate/config.json       ← + projectId: "proj_ubTez4-mxO"
    └── flowstate-workers/
        └── .flowstate/config.json       ← + projectId: "proj_J8jVdRouBv"
```

### What Goes in Each Package Config

```json
{
  "orgId": "org_9f3omFEY2H",
  "workspaceId": "work_ojk4TWK5D2",
  "codebaseId": "code_TDgAohsyX1",
  "projectId": "proj_HpfQyaJBl5",
  "projectName": "@epicdm/flowstate-cli",
  "projectType": "cli"
}
```

### Apps Sub-Directory

Monorepos often have nested package directories:

```
packages/apps/flowstate-app-bizdev/.flowstate/config.json
packages/flowstate-workers/.flowstate/config.json
```

Both patterns are valid. The key rule: **every directory with a `package.json` that is tracked in FlowState needs a `projectId` in its `.flowstate/config.json`**.

---

## Linking Rules

### Where `projectId` Is Stored

| Location                                     | Contains                         |
| -------------------------------------------- | -------------------------------- |
| Root `.flowstate/config.json`                | No `projectId` (workspace-level) |
| `packages/<pkg>/.flowstate/config.json`      | `projectId` for that package     |
| `packages/apps/<app>/.flowstate/config.json` | `projectId` for that app         |

### Resolution Order

When an agent needs `projectId`:

1. Read the package-level `.flowstate/config.json` (nearest to the code being worked on)
2. If `projectId` missing: **create the project and write it to the config**
3. Never use a root-level config's `projectId` for package-level work

### Pre-Flight Check

Before creating milestones or tasks, verify the project exists:

```
collection-get projects <projectId>
```

If the project doesn't exist:

1. Create it (see below)
2. Write the `projectId` to the package `.flowstate/config.json`
3. Commit the config

---

## Creating a Project

### For a Monorepo Package

```
collection-create projects {
  name: "<kebab-case-package-name>",
  title: "<Package Title>",
  description: "<package description from package.json>",
  status: "active",
  completed: false,
  archived: false,
  version: 1,
  orgId: "<orgId>",
  workspaceId: "<workspaceId>",
  codebaseId: "<codebaseId>"
}
```

After creation:

1. Record the generated `proj_XXXXX` ID
2. Write `"projectId": "proj_XXXXX"` to `packages/<pkg>/.flowstate/config.json`
3. Commit the config file

### With a Specific ID (Restoring a Deleted Project)

If the config already has a `projectId` but the project doesn't exist in FlowState (e.g., accidentally deleted):

```
collection-create projects {
  id: "<existing-proj_XXXXX>",
  name: "<name>",
  title: "<title>",
  ...
}
```

Use the existing ID from config to preserve all existing milestone/task references.

---

## Dependency Chain

Before creating a project, confirm:

| Dependency | Check                                     | Create If Missing                            |
| ---------- | ----------------------------------------- | -------------------------------------------- |
| Org        | `collection-get orgs <orgId>`             | [org-schema.md](./org-schema.md)             |
| Workspace  | `collection-get workspaces <workspaceId>` | [workspace-schema.md](./workspace-schema.md) |

Codebase is optional but recommended for projects linked to code packages:

| Dependency | Check                                   | Create If Missing                          |
| ---------- | --------------------------------------- | ------------------------------------------ |
| Codebase   | `collection-get codebases <codebaseId>` | [codebase-schema.md](./codebase-schema.md) |

---

## Create-If-Missing Logic

When any process needs to create a milestone or task and the project is missing:

```
1. Read package .flowstate/config.json
   → if projectId present:
     → collection-get projects <projectId>
     → if found: use it
     → if NOT found: create with that same ID (restore)
   → if projectId absent:
     → collection-query projects { workspaceId, name: <package-name> }
     → if found: write projectId to config
     → if NOT found: create new project, write projectId to config
2. Commit updated config before proceeding
```

---

## Error Handling

| Situation                               | Action                                                          |
| --------------------------------------- | --------------------------------------------------------------- |
| `projectId` missing from package config | Run workspace-codebase-audit-process or create project manually |
| `collection-get projects` returns 404   | Project deleted — create with same ID, write to config          |
| Task creation fails with invalid projId | Verify project exists first                                     |
| Milestone has wrong projectId           | Update milestone record with correct projectId                  |
| Root config has `projectId`             | Likely wrong — `projectId` belongs in package config, not root  |

---

## Conventions

| Item              | Convention                                                |
| ----------------- | --------------------------------------------------------- |
| Project ID format | `proj_XXXXX` (auto-generated)                             |
| One per package   | Every npm package in a monorepo gets its own project      |
| Config field      | `projectId` in package-level `.flowstate/config.json`     |
| Project name      | kebab-case stripped of npm scope (`@scope/name` → `name`) |
| Initial status    | `active` with `completed: false`                          |
| codebaseId        | Same value as monorepo root config                        |

---

_Created: 2026-03-29_
