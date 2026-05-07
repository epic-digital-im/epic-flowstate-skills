---
name: flowstate-feature-declare
description: Use during brainstorming, multi-phase planning, and task execution to declare which feature-matrix slugs the work touches and which gap-items it addresses - creates relations linking tasks/milestones/projects back to features so the matrix is kept in sync at planning time, not only post-merge
---

# Feature Declare

**Status:** Active
**Purpose:** Force explicit declaration of feature-matrix slugs touched by design/implementation work. Link those features back to the originating FlowState entity via the `relations` collection so the matrix stays in sync at planning time, not only post-merge.
**Scope:** Sub-skill invoked by `flowstate-brainstorming`, `flowstate-multi-phase-planning`, `flowstate-task-execution`
**Trigger:** Before persisting a design doc, before creating phase tasks, at task start

---

## Overview

Without explicit feature declaration at planning time, the feature matrix drifts. `flowstate-feature-matrix-sync` catches drift post-merge, but that is too late — brainstorming and planning are where "what we will build" gets defined, and that intent must be linked to the matrix.

```
Load matrix -> Declare slugs -> Validate -> Create missing -> Create relations
    (1)            (2)            (3)          (4)               (5)
```

This skill is MANDATORY for any entity that represents work (project/milestone/task). Parent skills (brainstorming, multi-phase-planning, task-execution) must invoke it.

---

## Prerequisites

- `orgId`, `workspaceId` from `.flowstate/config.json`
- The entity being declared against (project, milestone, or task) exists
- Agent identity loaded (for `userId` / `linkedBy` attribution)

---

## Step 1: Load Feature Matrix

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query all features scoped to org:
   ```
   collection-query features { "orgId": "<orgId>" }
   ```
2. Query open gap-items:
   ```
   collection-query gap-items { "orgId": "<orgId>", "status": "open" }
   ```
3. Build in-memory lookups:
   - `featureBySlug: slug → { id, title, layer, tiers, productId }`
   - `gapBySlug: slug → { id, title, priority, status, linkedFeature }`

### Done when

- Both lookups populated

---

## Step 2: Declare Slugs

**Who:** Assigned agent
**Pause:** Yes (user approval required)

### Actions

1. From the design/plan/task scope, generate a proposed declaration:
   ```json
   {
     "featureSlugs": ["layer-4-workflow-orchestrator", "layer-6-event-store"],
     "gapSlugs": ["gap-layer-4-notification-service"],
     "newFeatures": [
       { "slug": "layer-8-audit-export", "title": "Audit Export", "layer": "infra" }
     ]
   }
   ```
2. For each `featureSlugs[i]`:
   - If slug NOT in `featureBySlug` → move to `newFeatures` with `layer` inferred from the slug prefix
   - If slug's `tiers.community === "available"` AND all other tiers `available` → emit **REGRESSION WARNING**: "This feature is marked complete across all tiers. Is this intentional rework?"
3. For each `gapSlugs[i]`:
   - If slug NOT in `gapBySlug` and looks like a new gap → add to a `newGaps[]` list with `priority: P2`, `status: open`
4. Display the declaration + any warnings. Ask the user: "Approve this feature declaration?"

### Done when

- User approves the slug list (exact set committed)

---

## Step 3: Create Missing Features and Gaps

**Who:** Assigned agent
**Pause:** No

### Actions

1. For each entry in `newFeatures[]`:
   ```
   collection-create features {
     slug: "<slug>",
     title: "<title>",
     layer: "<ui|api|agent|data|infra>",
     tiers: { community: "not-implemented", basic: "not-implemented", pro: "not-implemented", enterprise: "not-implemented" },
     codebaseLinks: [],
     productId: "<productId-from-parent-entity>",
     bizplanId: "<bizplanId-from-product>",
     description: "",
     orgId: "<orgId>",
     workspaceId: "<workspaceId>"
   }
   ```
2. For each entry in `newGaps[]`:
   ```
   collection-create gap-items {
     slug: "<slug>",
     title: "<title>",
     priority: "P2",
     status: "open",
     targetQuarter: null,
     linkedFeature: "<featureSlug or empty>",
     orgId: "<orgId>",
     workspaceId: "<workspaceId>"
   }
   ```
3. Record the returned IDs for Step 4.

### Done when

- All declared slugs exist in first-class collections

---

## Step 4: Create Relations

**Who:** Assigned agent
**Pause:** No

### Actions

1. For each declared feature, create a relation from the source entity:
   ```
   collection-create relations {
     sourceId: "<entityId>",
     sourceCollection: "<projects|milestones|tasks>",
     targetId: "<featureId>",
     targetCollection: "features",
     relationType: "touches",
     orgId: "<orgId>",
     workspaceId: "<workspaceId>"
   }
   ```
2. For each declared gap-item:
   ```
   collection-create relations {
     sourceId: "<entityId>",
     sourceCollection: "<projects|milestones|tasks>",
     targetId: "<gapItemId>",
     targetCollection: "gap-items",
     relationType: "addresses",
     orgId: "<orgId>",
     workspaceId: "<workspaceId>"
   }
   ```
3. If source is a task, also set `linkedTaskId` on each gap-item:
   ```
   collection-update gap-items <gapItemId> { linkedTaskId: "<taskId>" }
   ```

### Done when

- Relations persisted
- Gap items updated with `linkedTaskId` where applicable

---

## Step 5: Emit Declaration Summary

**Who:** Assigned agent
**Pause:** No

### Actions

1. Write a short summary to the entity's `description` or a linked discussion:
   ```
   ## Feature Matrix Declaration
   Touches: layer-4-workflow-orchestrator, layer-6-event-store
   Addresses: gap-layer-4-notification-service
   New features created: layer-8-audit-export
   ```
2. Return declaration object to the caller for use in subsequent steps (e.g. `flowstate-task-execution` Step 0).

### Done when

- Summary attached to entity
- Caller has declaration object

---

## Conventions

| Item                         | Convention                                                  |
| ---------------------------- | ----------------------------------------------------------- |
| Declaration timing           | Before design doc finalization, before phase task creation, at task start |
| Relation types               | `touches` (feature) or `addresses` (gap-item)               |
| New feature default tiers    | All four tiers `not-implemented`                            |
| Regression warning           | Fires when an `available`-across-all-tiers feature is re-declared |
| Mandatory                    | Yes — parent skills MUST invoke this                        |
| User approval                | Required before Step 3 writes anything                      |

---

## Cross-references

- `flowstate-feature-matrix-sync` — post-merge sync (complementary, runs after)
- `flowstate-brainstorming` — Step 0 invokes this after loading project context
- `flowstate-multi-phase-planning` — per-phase, before creating phase tasks
- `flowstate-task-execution` — Step 0 verifies this ran for the task; if not, runs it now
- `flowstate-linking-audit` — flags entities missing feature relations

---

_Created: 2026-04-18_
