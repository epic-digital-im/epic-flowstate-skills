---
name: flowstate-workspace-schema
description: Use when registering a repository in FlowState, verifying workspace records, or resolving workspaceId from config - provides workspace collection schema, linking rules, monorepo inheritance rules, and workspace creation commands.
---

# Workspace Schema

**Status:** Active
**Collection:** `workspaces`
**ID Prefix:** `work_`
**Hierarchy Level:** 2
**Parent Required:** `org` → `orgId` must exist and be valid

---

## Overview

A **workspace** is FlowState's unit of project isolation within an organization. All projects, milestones, tasks, and documents in a workspace are grouped together. A workspace typically maps to one git repository (or monorepo).

The `workspaceId` is stored in `.flowstate/config.json` at the repository root and in every package-level config within a monorepo.

```
Org  ← must exist first
└── Workspace  ← this document
    └── Codebase
    └── Project
        └── Milestone
            └── Task
```

**See also:** [workspace-registration-process.md](./workspace-registration-process.md) for the full registration flow.

---

## Schema

### Required Fields

| Field         | Type    | Description                            | Example              |
| ------------- | ------- | -------------------------------------- | -------------------- |
| `id`          | string  | Auto-generated primary key             | `work_ojk4TWK5D2`    |
| `orgId`       | string  | Parent organization ID                 | `org_9f3omFEY2H`     |
| `name`        | string  | Kebab-case workspace identifier        | `epic-flowstate`     |
| `title`       | string  | Human-readable display name            | `Epic FlowState`     |
| `description` | string  | Workspace description                  | `FlowState monorepo` |
| `status`      | string  | Active status (`active` or `archived`) | `active`             |
| `archived`    | boolean | Whether workspace is archived          | `false`              |
| `createdAt`   | string  | ISO 8601 creation timestamp            | `2025-01-01T00:00Z`  |
| `updatedAt`   | string  | ISO 8601 modified timestamp            | `2025-01-01T00:00Z`  |

### Optional Fields

| Field        | Type     | Description                 |
| ------------ | -------- | --------------------------- |
| `userId`     | string   | Creator user ID             |
| `tags`       | string[] | Classification tags         |
| `icon`       | string   | Emoji or icon identifier    |
| `color`      | string   | UI color value              |
| `archivedAt` | string   | ISO 8601 archival timestamp |
| `metadata`   | object   | Custom metadata             |
| `extended`   | object   | Extended data               |

### Collection Indexes

| Index                | Purpose                    |
| -------------------- | -------------------------- |
| `orgId + createdAt`  | List workspaces for an org |
| `name + createdAt`   | Lookup by name             |
| `status + createdAt` | Filter by active/archived  |

---

## Linking Rules

### Where `workspaceId` Is Stored

Every repository must have `workspaceId` in its root `.flowstate/config.json`:

```json
{
  "orgId": "org_9f3omFEY2H",
  "workspaceId": "work_ojk4TWK5D2",
  "codebaseId": "code_XXXXX"
}
```

In monorepos, the `workspaceId` is also inherited by every package-level config:

```json
{
  "orgId": "org_9f3omFEY2H",
  "workspaceId": "work_ojk4TWK5D2",
  "codebaseId": "code_XXXXX",
  "projectId": "proj_XXXXX"
}
```

### Resolution Order

When an agent needs `workspaceId`:

1. Read `.flowstate/config.json` at the package root (monorepo package or repo root)
2. If not found, read the repository root `.flowstate/config.json`
3. If still not found → **must create a workspace** before proceeding

### Pre-Flight Check

Before creating any project, milestone, or task, verify the workspace exists:

```
collection-get workspaces <workspaceId>
```

If this fails:

- Workspace has been deleted or `workspaceId` is wrong
- Run [workspace-registration-process.md](./workspace-registration-process.md) to create a new one

---

## Creating a Workspace

Workspaces are created once per repository during initial setup.

```
collection-create workspaces {
  name: "<kebab-case-project-name>",
  title: "<Human-Readable Title>",
  description: "<project description>",
  status: "active",
  archived: false,
  orgId: "<orgId>",
  tags: ["<relevant-tags>"]
}
```

After creation:

1. Record the generated `work_XXXXX` ID
2. Write it to `.flowstate/config.json` as `workspaceId`
3. Create the codebase record (see [codebase-schema.md](./codebase-schema.md))
4. Commit the config

**Full process:** [workspace-registration-process.md](./workspace-registration-process.md)

---

## Dependency Chain

Before creating a workspace, confirm:

| Dependency | Check                         | Create If Missing                    |
| ---------- | ----------------------------- | ------------------------------------ |
| Org        | `collection-get orgs <orgId>` | See [org-schema.md](./org-schema.md) |

---

## Error Handling

| Situation                         | Action                                                             |
| --------------------------------- | ------------------------------------------------------------------ |
| `workspaceId` missing from config | Run workspace-registration-process                                 |
| `collection-get workspaces` fails | Workspace deleted — re-register via workspace-registration-process |
| Wrong `orgId` on workspace        | Query `collection-query workspaces {orgId: <id>}`                  |
| Workspace name conflict           | Query existing workspaces, reuse if same org                       |
| Config has wrong workspaceId      | Update config, verify against FlowState record                     |

---

## Conventions

| Item                | Convention                                            |
| ------------------- | ----------------------------------------------------- |
| Workspace ID format | `work_XXXXX` (auto-generated)                         |
| Workspace name      | kebab-case repo/project name                          |
| Config field        | `workspaceId` in `.flowstate/config.json`             |
| One per repo        | Each git repository gets exactly one workspace        |
| Monorepos           | All packages in a monorepo share the same workspaceId |

---

_Created: 2026-03-29_
