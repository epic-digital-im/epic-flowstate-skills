---
name: flowstate-package-docs-sync-verify
description: Use after package documentation changes when docs need to be validated, route-compatible, synced into the docs site, or checked before feature matrix audit.
---

# FlowState Package Docs Sync Verify

**Status:** Active
**Purpose:** Verify package docs are valid, syncable, and useful as feature audit evidence.
**Scope:** Package-local `.flowstate/docs` and monorepo docs sync output.
**Trigger:** After docs backfill, after PR docs updates, or before deep feature matrix audit.
**Input:** Package paths or docs audit report.
**Output:** Verification report and sync issues.

---

## Workflow

1. Validate file structure.
   - Required files exist.
   - Nested pages use directory `index.md`.
   - No unsupported flat pages under `.flowstate/docs`.

2. Validate content sections.
   - Package overview.
   - API/workflows/troubleshooting/maintenance.
   - Package feature matrix.
   - Evidence refs.

3. Validate links.
   - Local relative links.
   - Screenshot links.
   - Feature matrix links.
   - Related package links.

4. Validate machine-readable feature matrix.
   - `.flowstate/feature-matrix/package-features.json` parses.
   - Required fields exist.
   - Global feature record ids are plausible.
   - Product ids are plausible when present.

5. Run sync command when requested.
   - Preferred docs-sync command when this separate verification project is in scope:

```bash
yarn workspace @epicdm/flowstate-docs docs:sync
```

6. Produce report.

## Output Shape

```json
{
  "packagesChecked": 54,
  "valid": 0,
  "invalid": 0,
  "warnings": [],
  "syncCommand": "yarn workspace @epicdm/flowstate-docs docs:sync",
  "syncRan": false
}
```

## Rules

- Do not run docs sync unless it is available and appropriate for the repo.
- If sync fails, preserve the error and identify the package docs likely responsible.
- Do not mutate global feature matrix records.
- Verification reports should be saved under `.flowstate/package-docs/verification/`.

---

_Created: 2026-05-14_
