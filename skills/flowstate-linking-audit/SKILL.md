---
name: flowstate-linking-audit
description: Use to validate the full bizplan→product→roadmap→initiative→project→milestone→task chain for the entire org, detect orphaned entities at every level, and batch-fix missing junctions so the linking spine is enforced end-to-end
---

# Linking Audit

**Status:** Active
**Purpose:** Validate the complete FlowState entity linking chain and batch-fix gaps so every task traces upward to a business plan through a roadmap and initiative.
**Scope:** Org-wide
**Trigger:** Periodic (weekly), before major brainstorming sessions, after bulk imports, on user request

---

## Overview

Projects, milestones, and tasks drift from their upstream bizplan/product/roadmap/initiative linkage over time. `flowstate-pre-flight-check` enforces the downward chain (project→milestone→task) at create time. This skill fills the upward chain:

```
BusinessPlan → Product → Roadmap → Initiative → Project → Milestone → Task
     ✓            ✓         ✓          ✓            ✓           ✓         ✓
```

Every level must have a non-dangling connection to the level above.

---

## Prerequisites

- `orgId` from `.flowstate/config.json`
- Agent identity loaded for `linkedBy`/`userId` on any fix writes
- Read/write on: `businessplans`, `products`, `roadmaps`, `initiatives`, `productprojects`, `projects`, `relations`

---

## Step 0: Load Context

**Who:** Assigned agent
**Pause:** No

### Actions

1. Read `.flowstate/config.json` → extract `orgId`
2. Bulk-load all entities for the org:
   - `businessplans`
   - `products`
   - `roadmaps`
   - `initiatives`
   - `productprojects` (junction)
   - `projects`
3. Build lookup maps and reverse-indexes:
   - `productByBizplan: bizplanId → [productId, ...]`
   - `roadmapByProduct: productId → [roadmapId, ...]` (should be 1)
   - `initiativesByRoadmap: roadmapId → [initiativeId, ...]`
   - `projectsByProduct: productId → [projectId, ...]` (via productprojects)
   - `projectsByInitiative: initiativeId → [projectId, ...]` (via initiatives.projectIds)
4. Initialize issue report with counters and a per-issue list.

### Done when

- All maps in memory
- Report initialized

---

## Step 1: Audit Product Layer

**Who:** Assigned agent
**Pause:** No

### Actions

For each product, check:

| Check                               | Pass Condition                                      | Issue Type             |
| ----------------------------------- | --------------------------------------------------- | ---------------------- |
| Linked to a bizplan                 | `products.businessPlanId` set OR relation exists    | `product-no-bizplan`   |
| Has exactly one roadmap             | `roadmapByProduct[productId].length === 1`          | `product-no-roadmap`, `product-multi-roadmap` |
| Product uses canonical id prefix    | id starts with `prod_` (not `rec__*`)               | `product-legacy-id`    |

Log each issue with `{ severity, entityId, issueType, suggestedFix }`.

### Done when

- Product-layer issues captured

---

## Step 2: Audit Roadmap → Initiative Layer

**Who:** Assigned agent
**Pause:** No

### Actions

For each roadmap:

| Check                                     | Pass Condition                                       | Issue Type                |
| ----------------------------------------- | ---------------------------------------------------- | ------------------------- |
| Has at least one initiative               | `initiativesByRoadmap[roadmapId].length >= 1`        | `roadmap-no-initiative`   |
| Roadmap `productId` resolves              | Product exists                                       | `roadmap-orphan-product`  |

For each initiative:

| Check                                          | Pass Condition                                         | Issue Type                    |
| ---------------------------------------------- | ------------------------------------------------------ | ----------------------------- |
| `quarter` falls within roadmap range           | `startQuarter <= quarter <= endQuarter`                | `initiative-out-of-quarter`   |
| `projectIds[]` entries resolve                 | Every id exists in projects                            | `initiative-orphan-project`   |
| `projectIds[]` non-empty when status = `In Progress` | `status != "In Progress" || projectIds.length > 0`  | `initiative-empty-active`     |

### Done when

- Roadmap/initiative issues captured

---

## Step 3: Audit Project Layer

**Who:** Assigned agent
**Pause:** No

### Actions

For each project:

| Check                                   | Pass Condition                                        | Issue Type                |
| --------------------------------------- | ----------------------------------------------------- | ------------------------- |
| Linked to at least one product          | At least one `productprojects` row references it      | `project-no-product`      |
| In an initiative                        | At least one `initiatives.projectIds[]` contains it   | `project-no-initiative`   |
| Has `codebaseId` (if tracks code)       | `codebaseId` non-empty OR project marked non-code     | `project-no-codebase`     |

Severity: `project-no-product` = high (breaks chain); `project-no-initiative` = medium (mandatory per policy); `project-no-codebase` = low.

### Done when

- Project-layer issues captured

---

## Step 4: Generate Report

**Who:** Assigned agent
**Pause:** Yes

### Actions

1. Compile the audit report:

   ```markdown
   ## Linking Audit Report — <date>

   **Org:** <orgId>

   ### Summary
   | Layer       | Entities | Issues | Auto-fixable |
   |-------------|----------|--------|--------------|
   | Products    | <n>      | <n>    | <n>          |
   | Roadmaps    | <n>      | <n>    | <n>          |
   | Initiatives | <n>      | <n>    | <n>          |
   | Projects    | <n>      | <n>    | <n>          |

   ### Critical (breaks chain)
   | Entity | ID | Issue | Suggested Fix |
   |--------|-----|-------|---------------|
   | project | proj_... | no-product | Link via productprojects |

   ### Medium
   ...

   ### Manual Triage Required
   ...
   ```

2. Display to user. Ask: "Apply auto-fixes?"

### Done when

- User approves or rejects
- If rejected: return report without fixes

---

## Step 5: Apply Fixes

**Who:** Assigned agent
**Pause:** No (after Step 4 approval)

### Auto-fix rules

| Issue Type               | Auto-fix action                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `product-no-roadmap`     | Create roadmap record (`productId`, empty quarters; operator can fill later)          |
| `product-no-bizplan`     | Do NOT auto-fix; prompt for selection                                                 |
| `product-multi-roadmap`  | Keep the newest `_modified`; archive others                                           |
| `project-no-product`     | If project's codebase maps to a product's primary codebase → create `productprojects` with role `supporting`; else manual |
| `project-no-initiative`  | If product has exactly one `In Progress` or `Planned` initiative this quarter → append projectId; else manual |
| `initiative-orphan-project` | Remove the broken id from `projectIds[]`                                            |
| `product-legacy-id`      | Do NOT auto-fix; flag for migration                                                   |

### Actions

1. For each auto-fixable issue, apply the rule.
2. For manual-triage items, emit a prompt: "Select product for proj_XXX: [product list]".
3. After all fixes, re-run Steps 1–3 to verify. The report should show zero auto-fixable issues remaining.
4. Persist the final report as a discussion on the workspace entity.

### Done when

- Auto-fixes applied
- Manual-triage list presented (if any)
- Verification pass clean
- Report persisted

---

## Conventions

| Item                   | Convention                                         |
| ---------------------- | -------------------------------------------------- |
| Audit frequency        | Weekly or before any brainstorming session         |
| Auto-fix scope         | Only unambiguous single-candidate mappings         |
| Report format          | Markdown in a workspace-scoped `discussions` row   |
| Legacy `rec__*` IDs    | Flag only; do not auto-migrate                     |
| `linkedBy` on junctions | Use agent's teamMemberId                          |

---

## Cross-references

- `flowstate-entity-audit` — team/identity linking audit (complementary)
- `flowstate-pre-flight-check` — enforces downward chain at create time
- `flowstate-product-link-projects` — creates productprojects junctions
- `flowstate-roadmap-schema` / `flowstate-initiative-schema` — authoritative schema references

---

_Created: 2026-04-18_
