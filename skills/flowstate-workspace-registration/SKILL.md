---
name: flowstate-workspace-registration
description: Use when setting up FlowState for a new git repository that needs its own workspace - creates workspace record, codebase record, and root .flowstate/config.json with orgId/workspaceId/codebaseId in 5 steps. Requires an existing org.
---

# Workspace Registration Process

**Status:** Active
**Purpose:** Create a FlowState workspace for a project, register its codebase, and initialize the `.flowstate/config.json` configuration file
**Scope:** Any project repository that needs its own FlowState workspace within an existing organization
**Trigger:** New project needs FlowState integration under an existing org
**Input:** Organization ID (`orgId`), local repository path, GitHub repository URL
**Output:** Workspace record, codebase record, `.flowstate/config.json` in the repository

---

## Overview

A workspace is FlowState's unit of project isolation within an organization. Each workspace gets its own projects, milestones, tasks, and documents. Workspace registration creates the workspace record, links the git repository as a codebase, and writes the local config file that all other FlowState processes depend on.

This process requires an existing organization. If no org exists, create one first.

```
Detect Repo -> Create Workspace -> Create Codebase -> Write Config -> Verify
     (0)             (1)                (2)               (3)          (4)
```

---

## Prerequisites

Before starting:

- An organization exists in FlowState (you have the `orgId`) — see [org-schema.md](./org-schema.md)
- The local directory is an initialized git repository
- The repository has a GitHub remote configured

**Schema references:** [flowstate-config.md](./flowstate-config.md) · [workspace-schema.md](./workspace-schema.md) · [codebase-schema.md](./codebase-schema.md) · [object-hierarchy.md](./object-hierarchy.md)

---

## Step 0: Detect Repository Context

**Who:** Assigned agent
**Pause:** No

### Actions

1. Confirm the directory is a git repository:
   ```bash
   git rev-parse --is-inside-work-tree
   ```
2. Get the repository root path:
   ```bash
   git rev-parse --show-toplevel
   ```
3. Get the GitHub remote URL:
   ```bash
   git remote get-url origin
   ```
4. Get the default branch:
   ```bash
   git branch -r | grep -E 'origin/(main|dev|master)' | head -1
   ```
5. Read `package.json` to extract:
   - `name` (project name)
   - `description`
   - Package manager (check for `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`)
6. Check repository visibility:
   ```bash
   gh repo view <owner/repo> --json isPrivate --jq '.isPrivate'
   ```
7. Detect project type from file structure:

   | Signal                             | Type        |
   | ---------------------------------- | ----------- |
   | Multiple `packages/` directories   | `monorepo`  |
   | `app/` or `pages/` + `components/` | `fullstack` |
   | `src/index.ts` only                | `library`   |
   | `wrangler.toml`                    | `worker`    |

8. Check if `.flowstate/config.json` already exists:
   - If it exists and has a `workspaceId`, this workspace is already registered
   - If it does not exist, proceed with fresh registration

### Done when

- Repository root, remote URL, default branch captured
- Project name, description, type, package manager identified
- Existing config status known

---

## Step 1: Create Workspace

**Who:** Assigned agent
**Pause:** No

### Actions

1. Create the workspace record:
   ```
   collection-create workspaces {
     name: "<project-name>",
     title: "<Project Title>",
     description: "<project description>",
     status: "active",
     archived: false,
     orgId: "<orgId>",
     tags: ["<relevant-tags>"]
   }
   ```
2. Record the generated workspace ID (`work_XXXXX`)

### Workspace fields

| Field         | Source                                      | Required |
| ------------- | ------------------------------------------- | -------- |
| `name`        | kebab-case project name                     | Yes      |
| `title`       | Human-readable title                        | Yes      |
| `description` | `package.json` description or user-provided | Yes      |
| `status`      | `"active"`                                  | Yes      |
| `archived`    | `false`                                     | Yes      |
| `orgId`       | Provided org ID                             | Yes      |
| `tags`        | Project-relevant tags                       | No       |

### Done when

- Workspace record exists in FlowState
- Workspace ID recorded

---

## Step 2: Create Codebase Record

**Who:** Assigned agent
**Pause:** No

### Actions

1. Create the codebase record linked to the new workspace:
   ```
   collection-create codebases {
     name: "<project-name>",
     title: "<Project Title>",
     description: "<project description with package count and structure>",
     repository: {
       url: "<github-url>",
       defaultBranch: "<main|dev>",
       provider: "github",
       privateRepo: <true|false>,
       localPath: "<absolute-repo-path>"
     },
     environment: {
       runtime: "node",
       packageManager: "<pnpm|yarn|npm>",
       language: "typescript",
       projectType: "<monorepo|fullstack|library|worker>",
       setupCommands: ["<package-manager> install"]
     },
     tags: ["<relevant-tags>"],
     status: "active",
     archived: false,
     orgId: "<orgId>",
     workspaceId: "<workspaceId>"
   }
   ```
2. Record the generated codebase ID (`code_XXXXX`)

### Done when

- Codebase record exists in FlowState with workspace and org linkage
- Codebase ID recorded

---

## Step 3: Write FlowState Config

**Who:** Assigned agent
**Pause:** No

### Actions

1. Create the `.flowstate/` directory if it does not exist:

   ```bash
   mkdir -p .flowstate
   ```

2. Write `.flowstate/config.json`:

   ```json
   {
     "version": "1.0.0",
     "projectName": "<project-name>",
     "projectType": "<project-type>",
     "codebaseId": "<code_XXXXX>",
     "orgId": "<orgId>",
     "workspaceId": "<work_XXXXX>",
     "vault": {
       "name": "<vault-name>",
       "type": "1password"
     },
     "repository": {
       "url": "<github-url>",
       "provider": "github"
     },
     "dependencies": {
       "node": "<node-version>",
       "packageManager": "<pnpm|yarn|npm>",
       "docker": <true|false>
     },
     "createdAt": "<ISO-8601-timestamp>",
     "lastUpdated": "<ISO-8601-timestamp>"
   }
   ```

3. Stage the config file:
   ```bash
   git add .flowstate/config.json
   ```

### Done when

- `.flowstate/config.json` exists with orgId, workspaceId, and codebaseId
- Config file is staged in git

---

## Step 4: Verify Registration

**Who:** Assigned agent
**Pause:** No

### Actions

1. Read back the workspace record:
   ```
   collection-get workspaces <workspace_id>
   ```
2. Read back the codebase record:
   ```
   collection-get codebases <codebase_id>
   ```
3. Verify the codebase's `workspaceId` matches the workspace ID
4. Read `.flowstate/config.json` and verify all IDs are present and consistent
5. Commit:

   ```
   git commit -m "chore: initialize FlowState workspace config

   Built with Epic Flowstate"
   ```

6. Report registration summary:
   ```
   Workspace registered:
     Workspace:  work_XXXXX (<title>)
     Codebase:   code_XXXXX
     Org:        <orgId>
     Repository: <github-url>
     Config:     .flowstate/config.json
   ```

### Done when

- Workspace and codebase records verified
- Config committed to git
- Summary reported

---

## Error Handling

| Situation                      | Action                                                    |
| ------------------------------ | --------------------------------------------------------- |
| Not a git repository           | Error: must initialize git first                          |
| No GitHub remote               | Ask user for repository URL                               |
| `gh` CLI not installed         | Skip visibility check, ask user                           |
| Workspace name already exists  | Query existing workspaces, ask user if they want to reuse |
| Config already has workspaceId | Ask user: update or skip                                  |
| orgId invalid                  | Verify org exists via collection-get before proceeding    |

---

## Conventions

| Item                | Convention                                     |
| ------------------- | ---------------------------------------------- |
| Config file path    | `.flowstate/config.json` at repository root    |
| Workspace name      | kebab-case project name                        |
| Codebase ID format  | `code_XXXXX` (auto-generated)                  |
| Workspace ID format | `work_XXXXX` (auto-generated)                  |
| Config version      | `"1.0.0"`                                      |
| Commit message      | `chore: initialize FlowState workspace config` |

---

_Created: 2026-03-28_
