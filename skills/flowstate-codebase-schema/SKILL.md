---
name: flowstate-codebase-schema
description: Use when linking a git repository to FlowState, verifying a codebase record exists, or ensuring codebaseId is propagated across monorepo package configs - provides codebase collection schema, repository and environment fields, and creation commands.
---

# Codebase Schema

**Status:** Active
**Collection:** `codebases`
**ID Prefix:** `code_`
**Hierarchy Level:** 2 (sibling to workspace, child of org)
**Parent Required:** `org` → `orgId`, `workspace` → `workspaceId`

---

## Overview

A **codebase** links a git repository to FlowState. It records the repository URL, environment metadata, and project tooling. The codebase ID (`codebaseId`) is shared across all packages in a monorepo — every package-level config references the same `codebaseId` as the root config.

```
Org
└── Workspace  ← parent
    └── Codebase  ← this document (1 per git repo)
    └── Project   ← multiple, each referencing this codebaseId
        └── Milestone
            └── Task
```

**See also:** [codebase-registration-process.md](./codebase-registration-process.md) for the full registration flow.

---

## Schema

### Required Fields

| Field         | Type    | Description                         | Example              |
| ------------- | ------- | ----------------------------------- | -------------------- |
| `id`          | string  | Auto-generated primary key          | `code_TDgAohsyX1`    |
| `orgId`       | string  | Parent organization ID              | `org_9f3omFEY2H`     |
| `name`        | string  | Kebab-case project name             | `epic-flowstate`     |
| `title`       | string  | Human-readable display name         | `Epic FlowState`     |
| `description` | string  | Project description                 | `FlowState monorepo` |
| `repository`  | object  | Repository connection details       | See below            |
| `environment` | object  | Runtime and tooling metadata        | See below            |
| `status`      | string  | Record status (`active`/`archived`) | `active`             |
| `archived`    | boolean | Whether codebase is archived        | `false`              |
| `createdAt`   | string  | ISO 8601 creation timestamp         | `2025-01-01T00:00Z`  |
| `updatedAt`   | string  | ISO 8601 modified timestamp         | `2025-01-01T00:00Z`  |

### `repository` Object

| Field           | Type    | Required | Description                          |
| --------------- | ------- | -------- | ------------------------------------ |
| `url`           | string  | Yes      | GitHub/GitLab HTTPS URL              |
| `defaultBranch` | string  | Yes      | Default branch (`main`, `dev`, etc.) |
| `provider`      | string  | Yes      | `github`, `gitlab`, or `bitbucket`   |
| `privateRepo`   | boolean | Yes      | Whether the repo is private          |
| `localPath`     | string  | No       | Absolute local path to the repo root |

### `environment` Object

| Field            | Type     | Required | Description                                  |
| ---------------- | -------- | -------- | -------------------------------------------- |
| `runtime`        | string   | Yes      | `node`, `deno`, `bun`, `python`, etc.        |
| `packageManager` | string   | Yes      | `yarn`, `npm`, `pnpm`                        |
| `language`       | string   | Yes      | `typescript`, `javascript`, `python`         |
| `projectType`    | string   | Yes      | `monorepo`, `fullstack`, `library`, `worker` |
| `runtimeVersion` | string   | No       | Node version e.g. `20.x`                     |
| `framework`      | string   | No       | `nextjs`, `hono`, `expo`, `none`             |
| `setupCommands`  | string[] | No       | Init commands e.g. `["yarn install"]`        |

### Optional Fields

| Field           | Type     | Description                  |
| --------------- | -------- | ---------------------------- |
| `workspaceId`   | string   | Parent workspace ID          |
| `userId`        | string   | Creator user ID              |
| `tags`          | string[] | Classification tags          |
| `metadata`      | object   | Custom metadata              |
| `extended`      | object   | Extended data                |
| `deployment`    | object   | Deployment configuration     |
| `agentWorkflow` | object   | Agent workflow configuration |

### Collection Indexes

| Index                     | Purpose                        |
| ------------------------- | ------------------------------ |
| `orgId + createdAt`       | List codebases for an org      |
| `workspaceId + createdAt` | List codebases for a workspace |

---

## Linking Rules

### Where `codebaseId` Is Stored

`codebaseId` appears in **every** `.flowstate/config.json` in the repository — both root and per-package:

**Root config** (`/.flowstate/config.json`):

```json
{
  "orgId": "org_9f3omFEY2H",
  "workspaceId": "work_ojk4TWK5D2",
  "codebaseId": "code_TDgAohsyX1"
}
```

**Per-package config** (`packages/flowstate-cli/.flowstate/config.json`):

```json
{
  "orgId": "org_9f3omFEY2H",
  "workspaceId": "work_ojk4TWK5D2",
  "codebaseId": "code_TDgAohsyX1",
  "projectId": "proj_HpfQyaJBl5"
}
```

All packages in a monorepo share the **same** `codebaseId` — the codebase represents the entire git repository, not individual packages.

### Resolution Order

When an agent needs `codebaseId`:

1. Read the nearest `.flowstate/config.json`
2. If not present, read the repository root `.flowstate/config.json`
3. If missing → run [codebase-registration-process.md](./codebase-registration-process.md)

### Pre-Flight Check

Before creating projects, verify the codebase exists:

```
collection-get codebases <codebaseId>
```

---

## Creating a Codebase

Codebases are created once per git repository.

```
collection-create codebases {
  name: "<kebab-case-project-name>",
  title: "<Project Title>",
  description: "<description>",
  repository: {
    url: "<https-github-url>",
    defaultBranch: "<main|dev>",
    provider: "github",
    privateRepo: <true|false>,
    localPath: "<absolute-path>"
  },
  environment: {
    runtime: "node",
    packageManager: "<yarn|npm|pnpm>",
    language: "typescript",
    projectType: "<monorepo|fullstack|library|worker>",
    setupCommands: ["<pkg-manager> install"]
  },
  status: "active",
  archived: false,
  orgId: "<orgId>",
  workspaceId: "<workspaceId>"
}
```

After creation:

1. Record the generated `code_XXXXX` ID
2. Write it to the root `.flowstate/config.json` as `codebaseId`
3. Propagate `codebaseId` to all per-package configs
4. Commit all config files

**Full process:** [codebase-registration-process.md](./codebase-registration-process.md)

---

## Dependency Chain

Before creating a codebase, confirm:

| Dependency | Check                                     | Create If Missing                            |
| ---------- | ----------------------------------------- | -------------------------------------------- |
| Org        | `collection-get orgs <orgId>`             | [org-schema.md](./org-schema.md)             |
| Workspace  | `collection-get workspaces <workspaceId>` | [workspace-schema.md](./workspace-schema.md) |

---

## Error Handling

| Situation                           | Action                                          |
| ----------------------------------- | ----------------------------------------------- |
| `codebaseId` missing from config    | Run codebase-registration-process               |
| `collection-get codebases` fails    | Codebase deleted — re-register                  |
| Codebase has wrong `workspaceId`    | Update codebase record with correct workspaceId |
| Repository URL changed              | Update codebase `repository.url` field          |
| Package config missing `codebaseId` | Copy from root config, update package config    |

---

## Conventions

| Item                   | Convention                                               |
| ---------------------- | -------------------------------------------------------- |
| Codebase ID format     | `code_XXXXX` (auto-generated)                            |
| One per git repo       | All packages in a monorepo share the same codebaseId     |
| Config field           | `codebaseId` in every `.flowstate/config.json`           |
| Repository URL format  | HTTPS (e.g., `https://github.com/org/repo.git`)          |
| Project type detection | Inferred from file structure (see codebase-registration) |

---

_Created: 2026-03-29_
