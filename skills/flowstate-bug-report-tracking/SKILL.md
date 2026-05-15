---
name: flowstate-bug-report-tracking
description: Use when a FlowState CLI command, API, MCP tool, sync process, database query, or workspace/package workflow has an unexpected behavior, gotcha, or repeatable failure - provides dual filesystem and FlowState task capture workflow.
---

# Bug Report Tracking

**Status:** Active
**Purpose:** Capture FlowState tooling bugs and gotchas in both markdown artifacts and FlowState database entities.
**Scope:** All FlowState orgs, workspaces, codebases, packages, CLI commands, APIs, MCP tools, sync jobs, and database collection operations.
**Trigger:** Any unexpected behavior worth remembering, reproducing, assigning, or fixing later.
**Input:** Observed behavior, expected behavior, affected command/tool/API/package, evidence, workaround if known.
**Output:** Workspace bug report artifact plus FlowState task under the workspace Bug Reports project.

---

## Overview

Do not leave gotchas as chat memory. Persist them where future agents and humans can find them.

```
1 Detect -> 2 Classify -> 3 Ensure Tracking -> 4 Write Artifact -> 5 Create Task -> 6 Cross-Link
```

Use `flowstate-bug-report-schema` for field names, hierarchy, and templates.

---

## Step 1: Detect

**Who:** Agent
**Pause:** No

### Actions

1. Stop and capture the exact symptom.
2. Preserve the command, API call, MCP tool, selector, record IDs, package path, and error output.
3. Verify whether this is a one-off environment failure or a repeatable gotcha.

### Done when

- The observed behavior is concrete.
- The expected behavior is stated.
- At least one evidence item is available.

---

## Step 2: Classify Source

**Who:** Agent
**Pause:** No

### Actions

1. If the bug belongs to a package, read the nearest `packages/<pkg>/.flowstate/config.json`.
2. Use the package `projectId` as the milestone name when available.
3. If no package applies, choose a tool-surface milestone name such as `flowstate-cli`, `flowstate-mcp-tools`, `flowstate-apis`, `root-workspace`, or `sync`.
4. Read the root `.flowstate/config.json` for `orgId`, `workspaceId`, and `codebaseId`.

### Done when

- `orgId`, `workspaceId`, and source milestone name are known.
- The artifact source folder is known.

---

## Step 3: Ensure Tracking Entities

**Who:** Agent
**Pause:** No, unless entity creation fails or credentials are missing.

### Actions

1. Load `.flowstate/skills/bug-report-tracking.json` if it exists.
2. Ensure one workspace project named `bug-reports` / titled `Bug Reports` exists.
3. Ensure a milestone exists for the source under that project.
4. If CLI list/filter output looks suspicious, verify with direct `collection get` or `collection query`.

### Done when

- Bug Reports project ID is known.
- Source milestone ID is known.
- Local tracking JSON is updated with known IDs.

---

## Step 4: Write Filesystem Artifact

**Who:** Agent
**Pause:** No

### Actions

1. Create `.flowstate/bugs/<source>/` if missing.
2. Write `.flowstate/bugs/<source>/<yyyy-mm-dd-short-slug>.md`.
3. Include title, status, source, severity, environment, observed behavior, expected behavior, reproduction, evidence, workaround, FlowState IDs, and follow-up notes.
4. Update `.flowstate/bugs/README.md` with an index entry.

### Done when

- The markdown artifact is self-contained.
- The index links to the artifact.

---

## Step 5: Create FlowState Task

**Who:** Agent
**Pause:** No

### Actions

1. Create a task under the Bug Reports project and source milestone.
2. Put the artifact path in `metadata.artifactFile`.
3. Include command/API/tool details in metadata.
4. Include required blank linkage fields when no parent or assignee applies: `parentTaskId: ""` and `assigneeId: ""`.
5. Use `status: "To Do"` unless active debugging starts immediately.

### Done when

- Task ID is known.
- Task metadata links back to the markdown artifact.

---

## Step 6: Cross-Link

**Who:** Agent
**Pause:** No

### Actions

1. Add `taskId`, `projectId`, and `milestoneId` to the artifact.
2. Add or update the entry in `.flowstate/skills/bug-report-tracking.json`.
3. Mention the gotcha in any relevant local `.flowstate/skills/*.md` steering file.

### Done when

- Filesystem and database records mutually reference each other.
- Future agents can locate the issue from either side.

---

## Required Artifact Template

```markdown
# <Bug Title>

**Status:** To Do
**Severity:** Medium
**Source:** <flowstate-cli|flowstate-mcp-tools|package path>
**Reported:** <YYYY-MM-DD>
**Task:** <taskId or pending>
**Project:** <bugReportsProjectId>
**Milestone:** <milestoneId>

## Summary

<One paragraph.>

## Observed

<What happened.>

## Expected

<What should have happened.>

## Reproduction

1. <Step>
2. <Step>

## Evidence

- `<command or id>`

## Workaround

<Known safe workaround or "None known yet.">

## Follow-Up

- [ ] <Next action>
```

---

## Known Gotcha Pattern

For FlowState collection filters:

| Symptom                                                                                      | Required Response                                                                                 |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `flowstate collection list <collection> --filter ...` returns empty but direct IDs are known | Verify records with `flowstate collection get <collection> <id>` and create a bug report.         |
| `collection list` and `collection query` disagree                                            | Treat `collection query` or direct `collection get` as stronger evidence and record the mismatch. |
| Entity creation succeeded but list filtering cannot find it                                  | Do not recreate blindly. Verify by ID first, then report the filter gotcha.                       |

---

## Rationalization Traps

| Excuse                                           | Reality                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| "This does not block execution."                 | Non-blocking gotchas still waste future time. Track them.                  |
| "The chat note is enough."                       | Chat is not durable workspace memory. Write the artifact and task.         |
| "It is probably local."                          | Local-only failures still need evidence and a follow-up decision.          |
| "The CLI returned empty, so the record is gone." | Direct `collection get` can prove the record exists. Verify before acting. |

---

## Error Handling

| Situation                                            | Action                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| FlowState CLI cannot connect                         | Write artifact with `taskId: pending`, record the CLI failure, and create the task once connectivity returns. |
| Bug Reports project missing                          | Create it under the root workspace using `flowstate-bug-report-schema`.                                       |
| Source package lacks `.flowstate/config.json`        | Use a tool-surface milestone and note the missing package config.                                             |
| Entity creation succeeds but local JSON update fails | Keep the database IDs in the artifact and retry the local JSON update before finishing.                       |

---

_Created: 2026-05-15_
