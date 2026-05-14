---
name: flowstate-feature-status-write
description: Use after a feature matrix audit is approved to write repo-local .flowstate/feature-matrix/status.json and status.md files that summarize current feature support, evidence, gaps, and audit timestamp.
---

# FlowState Feature Status Write

## Purpose

Write a local feature matrix status snapshot into each audited repository.

This gives every repo a readable and machine-readable view of the features it supports, the evidence found, and the known gaps.

## Target Files

For each audited repo:

- `.flowstate/feature-matrix/status.json`
- `.flowstate/feature-matrix/status.md`

## Inputs

- Approved reconciliation output
- Repo list
- Audit run id
- Audit timestamp
- Feature evidence grouped by repo

## Workflow

1. Confirm write scope.
   - Only write inside each repo's `.flowstate/feature-matrix` folder.
   - Create the folder if it does not exist.

2. Generate `status.json`.
   - Include audit metadata.
   - Include feature slugs relevant to the repo.
   - Include recommended/current statuses.
   - Include evidence refs.
   - Include gap refs.

3. Generate `status.md`.
   - Human-readable summary.
   - Counts by status.
   - Launch-critical gaps.
   - Feature table with evidence pointers.

4. Preserve reviewability.
   - Keep output deterministic.
   - Sort features by layer, slug, then title.
   - Sort evidence by repo/path/line.

## JSON Shape

```json
{
  "auditRunId": "feat-audit-2026-05-13",
  "generatedAt": "2026-05-13T00:00:00.000Z",
  "repo": {
    "name": "flowstate-platform",
    "path": "/Users/sthornock/code/epic/flowstate-platform",
    "codebaseId": "code_z31pukaemI"
  },
  "counts": {
    "available": 0,
    "partial": 0,
    "notImplemented": 0,
    "manualReview": 0
  },
  "features": []
}
```

## Markdown Sections

Use this order:

1. Title and audit metadata
2. Status counts
3. Launch-critical gaps
4. Feature status table
5. Manual review items
6. Evidence appendix

## Rules

- Do not write status files before reconciliation is approved.
- Do not update MCP collections from this skill.
- Avoid absolute line ranges in Markdown; use file path plus single line when known.
- If a repo has no feature evidence, write a status file that says so explicitly.
