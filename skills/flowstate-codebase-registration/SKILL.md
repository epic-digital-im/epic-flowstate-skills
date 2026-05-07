---
name: flowstate-codebase-registration
description: Use when linking a git repository to FlowState without creating a new workspace, adding a codebase record to an already-registered workspace, or updating a config missing codebaseId - creates codebase record and writes codebaseId to .flowstate/config.json. Requires existing workspace.
---

# Codebase Registration Process

**Status:** Active
**Purpose:** Link a local project repository and its GitHub remote to FlowState by creating a codebase record and initializing the `.flowstate/config.json` configuration file
**Scope:** Any git repository that needs to be tracked and managed through FlowState
**Trigger:** New project repository needs FlowState integration, or existing repo needs to be registered

---

## Overview

Codebase registration connects a local git repository to FlowState. The process creates a `codebases` collection record that captures the repository URL, environment details, and project metadata. It then creates or updates the `.flowstate/config.json` file in the repository root, which stores the orgId, workspaceId, and codebase reference that all other FlowState processes depend on.

This is a prerequisite process. Other processes (brainstorming, planning, task execution) read `.flowstate/config.json` to resolve context IDs. Without a registered codebase and config file, those processes cannot run.

```
Detect Repo -> Gather Info -> Create Codebase -> Write Config -> Verify
    (0)           (1)             (2)               (3)          (4)
```

---

## Prerequisites

Before starting:

- The local directory is an initialized git repository (`git init` or cloned)
- The repository has a GitHub remote configured
- You have the target `orgId` and `workspaceId` (from an existing FlowState organization)
- The `.flowstate/` directory exists or can be created at the repo root

**Schema references:** [flowstate-config.md](./flowstate-config.md) · [codebase-schema.md](./codebase-schema.md) · [object-hierarchy.md](./object-hierarchy.md)

---

## Step 0: Detect Repository Context

**Who:** Assigned agent
**Pause:** No

### Actions

1. Confirm the current directory is a git repository:
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
   git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'
   ```
   If that fails, check for `main` or `dev`:
   ```bash
   git branch -r | grep -E 'origin/(main|dev|master)' | head -1
   ```
5. Check if `.flowstate/config.json` already exists:
   - If it exists, read it and determine if this is an update or first-time setup
   - If it does not exist, this is a fresh registration

### Done when

- Repository root path confirmed
- GitHub remote URL captured
- Default branch identified
- Existing config status known (exists or not)

---

## Step 1: Gather Project Information

**Who:** Assigned agent
**Pause:** No

### Actions

1. Read `package.json` (if it exists) to extract:
   - `name` (project name)
   - `description`
   - `private` (boolean)
   - Package manager (check for `yarn.lock`, `pnpm-lock.yaml`, `package-lock.json`)

2. Detect project type by examining the file structure:

   | Signal                              | Project Type |
   | ----------------------------------- | ------------ |
   | `app/` or `pages/` + `components/`  | `fullstack`  |
   | `src/index.ts` + no `app/`          | `library`    |
   | `wrangler.toml` or `wrangler.jsonc` | `worker`     |
   | `next.config.*`                     | `nextjs`     |
   | `expo` in package.json              | `expo`       |
   | Multiple `packages/` directories    | `monorepo`   |

3. Detect runtime and tooling:
   - Node version (from `.nvmrc`, `.node-version`, or `engines` in `package.json`)
   - TypeScript (presence of `tsconfig.json`)
   - Testing framework (jest, vitest, etc.)
   - Linting (eslint config)
   - CI/CD (`.github/workflows/`, `.gitlab-ci.yml`)

4. Determine if the repository is private:

   ```bash
   gh repo view --json isPrivate --jq '.isPrivate'
   ```

5. Compile the gathered information into a project profile

### Done when

- Project name, description, and type identified
- Package manager and runtime version detected
- Repository visibility (public/private) confirmed

---

## Step 2: Create Codebase Record

**Who:** Assigned agent
**Pause:** No

### Actions

1. Resolve the target `orgId` and `workspaceId`:
   - If `.flowstate/config.json` exists, read from it
   - Otherwise, ask the user or read from a parent project

2. Create the codebase record in FlowState:

   ```
   collection-create codebases {
     name: "<project-name>",
     title: "<Project Title>",
     description: "<project description from package.json or user input>",
     repository: {
       url: "<github-remote-url>",
       defaultBranch: "<default-branch>",
       provider: "github",
       privateRepo: <true|false>,
       localPath: "<absolute-path-to-repo-root>"
     },
     environment: {
       runtime: "node",
       runtimeVersion: "<node-version>",
       packageManager: "<yarn|npm|pnpm>",
       language: "typescript",
       framework: "<nextjs|hono|expo|none>",
       projectType: "<fullstack|library|worker|monorepo>",
       setupCommands: ["<package-manager> install"]
     },
     tags: ["<relevant-tags>"],
     status: "active",
     archived: false,
     orgId: "<orgId>",
     workspaceId: "<workspaceId>"
   }
   ```

3. Record the generated codebase ID (`code_XXXXX`)

### Codebase record fields

| Field                        | Source                                              | Required |
| ---------------------------- | --------------------------------------------------- | -------- |
| `name`                       | `package.json` name or kebab-case of directory name | Yes      |
| `title`                      | Human-readable project title                        | Yes      |
| `description`                | `package.json` description or user-provided         | Yes      |
| `repository.url`             | `git remote get-url origin`                         | Yes      |
| `repository.defaultBranch`   | Detected default branch                             | Yes      |
| `repository.provider`        | `github` (or `gitlab`, `bitbucket`)                 | Yes      |
| `repository.privateRepo`     | `gh repo view --json isPrivate`                     | Yes      |
| `repository.localPath`       | `git rev-parse --show-toplevel`                     | No       |
| `environment.runtime`        | Detected from project files                         | Yes      |
| `environment.packageManager` | Detected from lock files                            | Yes      |
| `environment.projectType`    | Detected from file structure                        | Yes      |
| `status`                     | `active`                                            | Yes      |
| `archived`                   | `false`                                             | Yes      |

### Done when

- Codebase record exists in FlowState with all required fields
- Codebase ID recorded for config file

---

## Step 3: Write FlowState Config File

**Who:** Assigned agent
**Pause:** No

### Actions

1. Create the `.flowstate/` directory if it does not exist:

   ```bash
   mkdir -p .flowstate
   ```

2. Write `.flowstate/config.json` with the following structure:

   ```json
   {
     "version": "1.0.0",
     "projectName": "<project-name>",
     "projectType": "<project-type>",
     "codebaseId": "<code_XXXXX>",
     "orgId": "<orgId>",
     "workspaceId": "<workspaceId>",
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
       "packageManager": "<yarn|npm|pnpm>",
       "docker": <true|false>
     },
     "createdAt": "<ISO-8601-timestamp>",
     "lastUpdated": "<ISO-8601-timestamp>"
   }
   ```

3. If the config already exists, merge new fields without overwriting existing product configurations, goal IDs, or project IDs. Only update:
   - `codebaseId` (if not set)
   - `repository` (if changed)
   - `lastUpdated` timestamp

4. Add `.flowstate/config.json` to version control (it is NOT a secret):
   ```bash
   git add .flowstate/config.json
   ```

### Config file fields

| Field                         | Description                            | Source                        |
| ----------------------------- | -------------------------------------- | ----------------------------- |
| `version`                     | Config schema version                  | `"1.0.0"`                     |
| `projectName`                 | NPM package name or project identifier | `package.json` name           |
| `projectType`                 | Project classification                 | Step 1 detection              |
| `codebaseId`                  | FlowState codebase record ID           | Step 2 output                 |
| `orgId`                       | FlowState organization ID              | User input or parent          |
| `workspaceId`                 | FlowState workspace ID                 | User input or parent          |
| `vault.name`                  | 1Password vault name for secrets       | User input                    |
| `vault.type`                  | Secret provider type                   | `"1password"`                 |
| `repository.url`              | GitHub repository URL                  | `git remote`                  |
| `repository.provider`         | Git hosting provider                   | `"github"`                    |
| `dependencies.node`           | Node.js version constraint             | `.nvmrc` or `engines`         |
| `dependencies.packageManager` | Package manager name                   | Lock file detection           |
| `dependencies.docker`         | Whether Docker is used                 | `docker-compose.yml` presence |
| `createdAt`                   | When config was first created          | ISO timestamp                 |
| `lastUpdated`                 | Last modification timestamp            | ISO timestamp                 |

### Done when

- `.flowstate/config.json` exists with codebase ID, org ID, and workspace ID
- Config file is staged in git

---

## Step 4: Verify Registration

**Who:** Assigned agent
**Pause:** No

### Actions

1. Read back the codebase record from FlowState:

   ```
   collection-get codebases <codebase_id>
   ```

2. Verify the record matches the local config:
   - `repository.url` matches the git remote
   - `orgId` matches the config file
   - `status` is `active`

3. Read `.flowstate/config.json` and verify:
   - `codebaseId` is set and matches the created record
   - `orgId` and `workspaceId` are present
   - `repository.url` matches the git remote

4. Commit the config file:

   ```
   git commit -m "chore: initialize FlowState config for <project-name>

   Built with Epic Flowstate"
   ```

5. Report the registration summary:
   ```
   Codebase registered:
     ID:         code_XXXXX
     Name:       <project-name>
     Repository: <github-url>
     Org:        <orgId>
     Workspace:  <workspaceId>
     Config:     .flowstate/config.json
   ```

### Done when

- Codebase record verified in FlowState
- Config file verified locally
- Config committed to git
- Registration summary reported

---

## Existing Config Handling

When `.flowstate/config.json` already exists:

| Scenario                         | Action                                                       |
| -------------------------------- | ------------------------------------------------------------ |
| Config exists, no `codebaseId`   | Create codebase record, add `codebaseId` to config           |
| Config exists with `codebaseId`  | Verify codebase record exists in FlowState, update if needed |
| Config exists, different `orgId` | Ask user which org is correct before proceeding              |
| Config has product/project data  | Preserve all existing data, only add/update codebase fields  |

---

## Error Handling

| Situation                               | Action                                                        |
| --------------------------------------- | ------------------------------------------------------------- |
| Not a git repository                    | Error: must initialize git first (`git init`)                 |
| No GitHub remote                        | Ask user for the repository URL                               |
| `gh` CLI not installed                  | Skip private repo detection, ask user                         |
| Codebase record creation fails          | Check orgId/workspaceId, retry                                |
| Config file write fails                 | Check file permissions, ensure `.flowstate/` directory exists |
| Config already has different codebaseId | Ask user: update existing or create new?                      |

---

## Conventions

| Item               | Convention                                                |
| ------------------ | --------------------------------------------------------- |
| Config file path   | `.flowstate/config.json` at repository root               |
| Codebase ID format | `code_XXXXX` (auto-generated by FlowState)                |
| Config version     | `"1.0.0"`                                                 |
| Repository URL     | HTTPS format (e.g., `https://github.com/org/repo.git`)    |
| Default branch     | Detected from remote HEAD, typically `main` or `dev`      |
| Commit message     | `chore: initialize FlowState config for <project-name>`   |
| Secret storage     | 1Password vault reference only, never plaintext in config |

---

_Created: 2026-03-28_
