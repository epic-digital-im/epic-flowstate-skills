---
name: flowstate-bug-report-schema
description: Use when tracking FlowState CLI, API, MCP, database, sync, or tool gotchas as bugs across a workspace - provides Bug Reports project hierarchy, artifact conventions, and task metadata fields.
---

# Bug Report Schema

**Status:** Active
**Purpose:** Standardize workspace-wide bug tracking for FlowState tooling issues and gotchas.
**Scope:** FlowState orgs, workspaces, codebases, monorepos, packages, CLI commands, APIs, and MCP tools.
**Trigger:** A FlowState command, API, MCP tool, sync process, database query, or package workflow behaves unexpectedly.
**Output:** One filesystem bug report plus one FlowState task under the workspace Bug Reports project.

---

## Overview

Each workspace gets exactly one `Bug Reports` project. Each offending package or tool surface gets a milestone under that project. Each bug or gotcha becomes a task and a markdown artifact.

```
Org
  -> Workspace
    -> Project: Bug Reports
      -> Milestone: <package-id-or-tool-surface>
        -> Task: <bug report item>
```

Use this skill with `flowstate-bug-report-tracking` for the capture workflow.

---

## Project

Create one project per workspace:

```
collection-create projects --data '{
  "name": "bug-reports",
  "title": "Bug Reports",
  "description": "Workspace-wide tracking for FlowState CLI, API, MCP, database, sync, and package gotchas.",
  "status": "active",
  "completed": false,
  "archived": false,
  "version": 1,
  "orgId": "<orgId>",
  "workspaceId": "<workspaceId>",
  "codebaseId": "<codebaseId>",
  "goalId": "",
  "productId": "",
  "roadmapId": "",
  "initiativeId": "",
  "metadata": {
    "purpose": "bug-report-tracking",
    "artifactRoot": ".flowstate/bugs"
  }
}'
```

Record the generated project ID in `.flowstate/skills/bug-report-tracking.json`.

---

## Milestones

Create one milestone per offending package or tool surface.

| Bug Source                    | Milestone Name                                                   | Milestone Title      |
| ----------------------------- | ---------------------------------------------------------------- | -------------------- |
| Package config exists         | Package `projectId` from `packages/<pkg>/.flowstate/config.json` | Package name or path |
| Root workspace issue          | `root-workspace`                                                 | Root Workspace       |
| CLI issue not tied to package | `flowstate-cli`                                                  | FlowState CLI        |
| MCP issue not tied to package | `flowstate-mcp-tools`                                            | FlowState MCP Tools  |
| API issue not tied to package | `flowstate-apis`                                                 | FlowState APIs       |

Milestone template:

```
collection-create milestones --data '{
  "name": "<package-id-or-tool-surface>",
  "title": "<Package or Tool Surface>",
  "description": "Bug reports and gotchas for <package-or-tool-surface>.",
  "status": "To Do",
  "completed": false,
  "archived": false,
  "version": 1,
  "projectId": "<bugReportsProjectId>",
  "goalId": "",
  "sortOrder": 0,
  "orgId": "<orgId>",
  "workspaceId": "<workspaceId>",
  "metadata": {
    "bugReportScope": "<package-path-or-tool-surface>",
    "packageConfig": "<path-to-package-.flowstate/config.json-or-empty>"
  }
}'
```

---

## Tasks

Each bug report task should include reproduction and tracking metadata.

```
collection-create tasks --data '{
  "name": "<yyyy-mm-dd-short-slug>",
  "title": "<Bug title>",
  "description": "<Observed behavior, expected behavior, and impact>",
  "status": "To Do",
  "completed": false,
  "archived": false,
  "version": 1,
  "projectId": "<bugReportsProjectId>",
  "milestoneId": "<milestoneId>",
  "orgId": "<orgId>",
  "workspaceId": "<workspaceId>",
  "parentTaskId": "",
  "assigneeId": "",
  "priority": 2,
  "sortOrder": 0,
  "metadata": {
    "bugType": "gotcha",
    "source": "flowstate-cli",
    "command": "flowstate collection list tasks --filter ...",
    "artifactFile": ".flowstate/bugs/<source>/<yyyy-mm-dd-short-slug>.md",
    "observed": "<what happened>",
    "expected": "<what should have happened>",
    "workaround": "<known safe workaround>",
    "evidence": ["<commands, files, ids, logs>"],
    "reportedAt": "<ISO timestamp>"
  }
}'
```

---

## Artifact Paths

| File                                                  | Purpose                                                |
| ----------------------------------------------------- | ------------------------------------------------------ |
| `.flowstate/bugs/README.md`                           | Workspace bug tracking index                           |
| `.flowstate/bugs/<source>/<yyyy-mm-dd-short-slug>.md` | Individual report                                      |
| `.flowstate/skills/bug-report-tracking.md`            | Workspace steering for local agents                    |
| `.flowstate/skills/bug-report-tracking.json`          | Local IDs for Bug Reports project and known milestones |

---

## CLI Gotcha Rule

When a `collection list --filter` result disagrees with direct `collection get` or `collection query`, record it as a gotcha. Prefer direct `collection get <collection> <id>` or `collection query <collection> <selector>` for verification until the list filter behavior is resolved.

---

## Red Flags

- Creating a bug task under the offending feature project instead of the workspace `Bug Reports` project.
- Using the root workspace config as a package project ID.
- Writing only a markdown file without creating the FlowState task.
- Creating a FlowState task without the artifact link in `metadata.artifactFile`.
- Treating an empty `collection list --filter` result as proof that records do not exist.

---

_Created: 2026-05-15_
