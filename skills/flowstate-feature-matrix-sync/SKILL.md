---
name: flowstate-feature-matrix-sync
description: Use at task completion (Step 9) and milestone finishing to detect feature status changes from merged code and update the first-class features and gap-items collections accordingly - complements flowstate-feature-declare (planning-time) by catching drift post-merge
---

# Feature Matrix Sync

**Status:** Active
**Purpose:** Keep the org-wide feature matrix in sync with code changes by detecting feature status changes after merges, using the declared feature list from `flowstate-feature-declare` plus git diff as evidence.
**Scope:** Called at `flowstate-task-execution` Step 9 and `flowstate-finishing-milestone`
**Trigger:** After a PR is merged into `dev` or after all milestone tasks complete
**Canonical storage:** First-class `features`, `gap-items`, `services` collections (post `flowstate-feature-matrix-init` migration). Do NOT read or write `records` with `schemaId: schm_*`.

---

## Overview

When code ships, features move `not-implemented` → `partial` → `available`. This skill reads the merged task's declared feature list (set via `flowstate-feature-declare`), cross-references against the git diff, and proposes status updates.

```
Load Declarations -> Get Merge Diff -> Propose Updates -> Apply
       (1)               (2)                (3)          (4)
```

---

## Step 1: Load Declarations

**Who:** Assigned agent
**Pause:** No

### Actions

1. Read the task's declared feature slugs via the `relations` collection:
   ```
   collection-query relations {
     sourceId: "<taskId>",
     sourceCollection: "tasks",
     targetCollection: "features",
     relationType: "touches"
   }
   ```
2. Load each linked feature:
   ```
   collection-query features { id: { $in: [<featureIds>] } }
   ```
3. If no declarations exist, fall back to path-based inference from `features.codebaseLinks[].packagePath` (legacy path — warn and recommend running `flowstate-feature-declare` retroactively).

### Done when

- Declared feature list in memory

---

## Step 2: Get Merge Diff

**Who:** Assigned agent
**Pause:** No

### Actions

1. Get the most recent merge commit on `dev`:
   ```bash
   git log --merges -1 --format="%H" dev
   ```
2. Get the diff of files changed:
   ```bash
   git diff --name-only HEAD~1..HEAD
   ```
3. Capture the list of changed file paths.

### Done when

- List of changed files from the merge captured

---

## Step 3: Propose Updates

**Who:** Assigned agent
**Pause:** Yes (if changes found)

### Actions

For each declared feature:

1. Check whether any changed path matches `feature.codebaseLinks[].packagePath`.
2. Read the matching changed files to determine status transition:
   - New files or significant additions to an `not-implemented` feature → propose `partial`
   - Test files added + implementation present → propose `partial` → `available`
   - Feature code deleted → propose downgrade
3. Build a diff list: `[ { featureId, slug, tierField, oldValue, newValue, evidence } ]`.
4. If diff list empty → log "No status changes detected" and return.
5. If changes found → display a table and ask "Apply these feature status updates?"
6. For any feature flagged as "no matching code found" that previously had code → propose creating a gap-item with `priority: P1`, `status: open`.

### Done when

- User approves or rejects proposed changes

---

## Step 4: Apply Updates

**Who:** Assigned agent
**Pause:** No

### Actions

1. For each approved feature change (first-class collection):
   ```
   collection-update features <featureId> {
     tiers: { <tierField>: "<newValue>" }
   }
   ```
2. For any new gap-items:
   ```
   collection-create gap-items {
     slug: "<slug>",
     title: "<title>",
     priority: "P1",
     status: "open",
     linkedFeature: "<featureSlug>",
     linkedTaskId: "<taskId>",
     targetQuarter: null,
     orgId: "<orgId>",
     workspaceId: "<workspaceId>"
   }
   ```
3. If a gap-item already exists for the missing feature, update its status or priority rather than creating a duplicate.
4. Log all changes with timestamps.

### Done when

- All approved changes applied
- Gap items created or updated
- Changes logged

---

## Conventions

| Item                | Convention                                                 |
| ------------------- | ---------------------------------------------------------- |
| Canonical storage   | `features`, `gap-items`, `services` (first-class)          |
| Legacy path         | Do NOT write to `records` with `schemaId: schm_*`          |
| Trigger points      | Task execution Step 9, milestone finishing                 |
| Scope               | Org-scoped features only                                   |
| Evidence            | Every status change requires a file path citation          |
| Gap creation        | Automatic for newly-missing features, priority P1          |
| Gap dedup           | Update existing gap-item rather than creating a duplicate   |
| User approval       | Required before applying changes                           |
| Declaration source  | `relations { sourceCollection, targetCollection: "features" }` set by `flowstate-feature-declare` |

---

## Cross-references

- `flowstate-feature-declare` — planning-time declaration (runs upstream)
- `flowstate-feature-matrix-init` — one-time migration to first-class collections
- `flowstate-linking-audit` — validates product/bizplan links on features

---

_Created: 2026-04-12_
_Updated: 2026-04-18 — migrated from `records+VCA` to first-class collections_
