---
name: flowstate-monorepo-audit
description: Use when a monorepo has workspace and codebase registered but packages lack FlowState project records or per-package config files - scans all packages, creates missing project records (preserving existing IDs from config), and writes package .flowstate/config.json files. Idempotent.
---

# Workspace & Codebase Audit Process

**Status:** Active
**Purpose:** Audit a registered workspace to ensure every package in a monorepo has a FlowState project record and a local `.flowstate/config.json` with correct workspace, project, and codebase IDs
**Scope:** Any monorepo workspace already registered in FlowState via the workspace-registration process
**Trigger:** Workspace exists but packages lack FlowState project records or config files
**Input:** Workspace ID (`workspaceId`), codebase ID (`codebaseId`), organization ID (`orgId`), repository root path
**Output:** One project record per package, one `.flowstate/config.json` per package, audit report

---

## Overview

After workspace and codebase registration, a monorepo may have a root-level `.flowstate/config.json` but no per-package tracking. This audit process scans the monorepo for packages, creates a FlowState project record for each one, and writes a package-level `.flowstate/config.json` that links the package to its project, workspace, and codebase.

This process is idempotent. Running it on an already-audited workspace skips packages that already have valid project records and config files.

```
Read Root Config -> Scan Packages -> Detect Package Info -> Create Projects -> Write Configs -> Verify
      (0)               (1)               (2)                   (3)              (4)           (5)
```

---

## Prerequisites

Before starting:

- The workspace is registered in FlowState (you have `workspaceId`, `orgId`, `codebaseId`)
- The root `.flowstate/config.json` exists with `orgId`, `workspaceId`, and `codebaseId` — see [flowstate-config.md](./flowstate-config.md)
- The repository is a monorepo with a `packages/` directory (or similar structure)

**Schema references:** [object-hierarchy.md](./object-hierarchy.md) · [project-schema.md](./project-schema.md) · [codebase-schema.md](./codebase-schema.md)

---

## Step 0: Read Root Configuration

**Who:** Assigned agent
**Pause:** No

### Actions

1. Read the root `.flowstate/config.json`:
   - Extract `orgId`, `workspaceId`, `codebaseId`
   - Note `projectType` (should be `monorepo`)
   - Note `repository.url` and `dependencies.packageManager`

2. Verify the workspace exists in FlowState:

   ```
   collection-get workspaces <workspaceId>
   ```

3. Verify the codebase exists in FlowState:

   ```
   collection-get codebases <codebaseId>
   ```

4. Query existing projects in the workspace:
   ```
   collection-query projects {
     "workspaceId": "<workspaceId>"
   }
   ```
   Record which projects already exist (by name) to avoid duplicates.

### Done when

- Root config IDs confirmed valid
- Workspace and codebase records verified
- Existing project list captured

---

## Step 1: Scan Packages

**Who:** Assigned agent
**Pause:** No

### Actions

1. List all directories under the monorepo packages path:

   ```bash
   ls -d packages/*/
   ```

   Also check for alternative package locations:

   ```bash
   ls -d apps/*/ 2>/dev/null
   ls -d libs/*/ 2>/dev/null
   ```

2. For each directory, check if it contains a `package.json`:
   - If yes, it is a package that needs a project record
   - If no, skip it (not a package)

3. Build the package inventory:

   | Field                        | Source                                 |
   | ---------------------------- | -------------------------------------- |
   | Directory name               | Folder name under `packages/`          |
   | Package path                 | Absolute path to the package directory |
   | Has `package.json`           | Boolean                                |
   | Has `.flowstate/config.json` | Boolean                                |
   | Existing `projectId`         | From existing config, if present       |

### Done when

- Complete list of packages with `package.json` files
- Each package's existing FlowState status known (has config or not)

---

## Step 2: Detect Package Information

**Who:** Assigned agent
**Pause:** No

### Actions

For each package found in Step 1, read its `package.json` and detect:

1. **Package metadata:**
   - `name` (NPM package name)
   - `description`
   - `version`
   - `private` (boolean)

2. **Project type** from file structure:

   | Signal                              | Type        |
   | ----------------------------------- | ----------- |
   | `app/` or `pages/` + `components/`  | `fullstack` |
   | `next.config.*`                     | `fullstack` |
   | `src/index.ts` + no `app/`          | `library`   |
   | `wrangler.toml` or `wrangler.jsonc` | `worker`    |
   | `expo` in dependencies              | `app`       |
   | Binary entry point in `bin` field   | `cli`       |

3. **Framework detection:**
   - Check dependencies for `next`, `hono`, `express`, `expo`, `react-native`
   - Check for `tsconfig.json` (TypeScript)

4. **Categorize each package:**

   | Category               | Action                                                         |
   | ---------------------- | -------------------------------------------------------------- |
   | Needs project + config | No existing `.flowstate/config.json`                           |
   | Needs project only     | Has config but no `projectId`                                  |
   | Needs config update    | Has project in FlowState but no local config                   |
   | Already complete       | Has config with valid `projectId` matching a FlowState project |

### Done when

- Every package has metadata extracted
- Every package has a project type assigned
- Every package is categorized for what action is needed

---

## Step 3: Create Project Records

**Who:** Assigned agent
**Pause:** No

### Actions

1. For each package that needs a project record, create it:

   ```
   collection-create projects {
     name: "<package-name>",
     title: "<Package Title>",
     description: "<package description from package.json>",
     status: "active",
     archived: false,
     orgId: "<orgId>",
     workspaceId: "<workspaceId>",
     tags: ["<project-type>", "<framework>"]
   }
   ```

2. Record each generated project ID (`proj_XXXXX`)

3. Build the project mapping:

   | Package Directory | Package Name | Project ID   | Type    |
   | ----------------- | ------------ | ------------ | ------- |
   | `packages/cli`    | `@scope/cli` | `proj_XXXXX` | cli     |
   | `packages/sdk`    | `@scope/sdk` | `proj_XXXXX` | library |

4. Create projects in parallel batches of 5 to speed up registration.

### Project fields

| Field         | Source                                  | Required |
| ------------- | --------------------------------------- | -------- |
| `name`        | kebab-case package name (strip scope)   | Yes      |
| `title`       | Human-readable title from package name  | Yes      |
| `description` | `package.json` description or generated | Yes      |
| `status`      | `"active"`                              | Yes      |
| `archived`    | `false`                                 | Yes      |
| `orgId`       | Root config `orgId`                     | Yes      |
| `workspaceId` | Root config `workspaceId`               | Yes      |
| `tags`        | Project type and framework tags         | No       |

### Done when

- Every package has a project record in FlowState
- Project ID mapping is complete

---

## Step 4: Write Package Configs

**Who:** Assigned agent
**Pause:** No

### Actions

1. For each package, create the `.flowstate/` directory if needed:

   ```bash
   mkdir -p packages/<pkg>/.flowstate
   ```

2. Write `packages/<pkg>/.flowstate/config.json`:

   ```json
   {
     "version": "1.0.0",
     "projectName": "<package-name>",
     "projectType": "<project-type>",
     "projectId": "<proj_XXXXX>",
     "codebaseId": "<code_XXXXX>",
     "orgId": "<orgId>",
     "workspaceId": "<work_XXXXX>",
     "repository": {
       "url": "<github-url>",
       "provider": "github"
     },
     "createdAt": "<ISO-8601-timestamp>",
     "lastUpdated": "<ISO-8601-timestamp>"
   }
   ```

3. Package configs inherit from root but add:
   - `projectId` linking to the package-specific project record
   - `projectType` specific to the package (not the root monorepo type)

4. Package configs do NOT include:
   - `vault` (inherits from root)
   - `dependencies` (inherits from root)
   - `products` (root-level concern)

5. Write configs in parallel batches of 5.

6. Stage all config files:
   ```bash
   git add packages/*/\.flowstate/config.json
   ```

### Package config vs root config

| Field          | Root Config             | Package Config          |
| -------------- | ----------------------- | ----------------------- |
| `projectName`  | Monorepo name           | Package name            |
| `projectType`  | `monorepo`              | Package-specific type   |
| `projectId`    | Not present             | Package project ID      |
| `codebaseId`   | Shared codebase ID      | Same shared codebase ID |
| `orgId`        | Organization ID         | Same organization ID    |
| `workspaceId`  | Workspace ID            | Same workspace ID       |
| `vault`        | Present                 | Not present (inherits)  |
| `dependencies` | Present                 | Not present (inherits)  |
| `products`     | Present (if applicable) | Not present             |

### Done when

- Every package has a `.flowstate/config.json` with correct IDs
- All config files are staged in git

---

## Step 5: Verify Audit

**Who:** Assigned agent
**Pause:** No

### Actions

1. For each package, verify the project record exists:

   ```
   collection-get projects <project_id>
   ```

2. For each package, read `.flowstate/config.json` and verify:
   - `projectId` matches the created project record
   - `codebaseId` matches the root config
   - `orgId` and `workspaceId` match the root config

3. Verify no orphaned projects (projects in FlowState without a local config):

   ```
   collection-query projects {
     "workspaceId": "<workspaceId>"
   }
   ```

   Compare against the package list.

4. Commit all config files:

   ```
   git commit -m "chore: add FlowState project configs for monorepo packages

   Built with Epic Flowstate"
   ```

5. Report the audit summary:

   ```
   Workspace Audit Complete:
     Workspace:  <workspaceId> (<workspace title>)
     Codebase:   <codebaseId>
     Org:        <orgId>

     Packages audited: <count>

     | Package | Project ID | Type | Status |
     |---------|-----------|------|--------|
     | <name>  | proj_XXX  | <type> | Created |
     | <name>  | proj_XXX  | <type> | Already existed |
   ```

### Done when

- All project records verified
- All config files verified
- No orphaned projects
- Config files committed
- Audit summary reported

---

## Idempotency

This process is safe to run multiple times. Each step handles existing state:

| Scenario                                     | Behavior                                         |
| -------------------------------------------- | ------------------------------------------------ |
| Package already has project record           | Skip creation, use existing project ID           |
| Package already has `.flowstate/config.json` | Verify IDs are correct, update if needed         |
| Package config has wrong project ID          | Update to correct project ID                     |
| Package removed from monorepo                | Flag orphaned project in summary (do not delete) |
| New package added to monorepo                | Create project record and config                 |

---

## Error Handling

| Situation                        | Action                                             |
| -------------------------------- | -------------------------------------------------- |
| Root config missing              | Error: run workspace-registration first            |
| Root config missing `codebaseId` | Error: run codebase-registration first             |
| No `packages/` directory         | Check for `apps/`, `libs/`, or other package paths |
| Package has no `package.json`    | Skip (not a package)                               |
| Project creation fails           | Check orgId/workspaceId, verify workspace exists   |
| Duplicate project name           | Query existing projects, reuse if same workspace   |
| Config write fails               | Check file permissions, verify directory exists    |

---

## Conventions

| Item                   | Convention                                                   |
| ---------------------- | ------------------------------------------------------------ |
| Package config path    | `packages/<pkg>/.flowstate/config.json`                      |
| Project ID format      | `proj_XXXXX` (auto-generated)                                |
| Project name           | kebab-case, stripped of NPM scope                            |
| Config version         | `"1.0.0"`                                                    |
| Package type detection | File structure signals (see Step 2)                          |
| Batch size             | 5 parallel operations for projects and configs               |
| Commit message         | `chore: add FlowState project configs for monorepo packages` |

---

_Created: 2026-03-28_
