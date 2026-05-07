---
name: flowstate-product-link-projects
description: Use when linking existing FlowState projects to a product via productprojects junction records - discovers projects in workspace, determines roles, and creates links. Composable sub-skill used by flowstate-creating-a-product orchestrator.
---

# Product Link Projects

**Status:** Active
**Purpose:** Link existing FlowState projects to a product via `productprojects` junction records
**Scope:** Any product that needs project associations
**Trigger:** Product exists and projects need to be linked
**Input:** Product ID, array of `{projectId, title, role}` pairs (or auto-discover from workspace)
**Output:** Junction record IDs

---

## Overview

Links existing FlowState projects to a product. Projects represent the execution layer — the actual codebases and packages that deliver the product. Each link includes a role indicating the project's relationship to the product.

```
Discover Projects -> Determine Roles -> Create Links -> Verify
       (0)                (1)               (2)          (3)
```

**Schema reference:** [flowstate-product-schema](../flowstate-product-schema/SKILL.md)

---

## Prerequisites

Before starting:

- Product exists (you have the `productId`)
- Projects exist in FlowState (created via monorepo-audit or manually)
- `orgId` and `workspaceId` available from `.flowstate/config.json`

---

## Step 0: Discover Projects

**Who:** Assigned agent
**Pause:** No

### Actions

1. If a project list is provided, use it directly

2. If no project list provided, query all projects in the workspace:

   ```
   collection-query projects { "workspaceId": "<workspaceId>" }
   ```

3. Present the list to the user for selection, or auto-link all if instructed

4. For each project, note:
   - `id` (project ID)
   - `title`
   - `name` (slug)
   - `description`

### Done when

- Project list identified (user-provided or discovered)
- Each project has ID and title

---

## Step 1: Determine Roles

**Who:** Assigned agent
**Pause:** No

### Actions

1. For each project, determine its relationship to the product:

   | Heuristic                                     | Role         |
   | --------------------------------------------- | ------------ |
   | Project name matches or contains product name | `primary`    |
   | Project is a shared library or dependency     | `supporting` |
   | Project is in a different domain              | `related`    |

2. Role definitions:

   | Role         | Description                              |
   | ------------ | ---------------------------------------- |
   | `primary`    | Main project delivering this product     |
   | `supporting` | Contributes code, libraries, or services |
   | `related`    | Loosely connected, informational link    |

3. If unsure, default to `supporting`

### Done when

- Every project has an assigned role
- Roles reviewed (or auto-assigned)

---

## Step 2: Create Junction Records

**Who:** Assigned agent
**Pause:** No

### Actions

1. For each project, call `product-add-project`:

   ```
   product-add-project {
     productId: "<productId>",
     title: "<project title>",
     orgId: "<orgId>",
     role: "<primary|supporting|related>",
     initiativeId: "<optional — link to roadmap initiative>"
   }
   ```

2. Process in batches of 7 for efficiency

3. Record each returned junction record ID

### Done when

- All projects linked to product
- Junction record IDs recorded

---

## Step 3: Verify

**Who:** Assigned agent
**Pause:** No

### Actions

1. Retrieve product via `product-get`:

   ```
   product-get { productId: "<productId>", orgId: "<orgId>" }
   ```

2. Confirm projects section shows expected count and roles

3. Report summary:

   ```
   Projects linked to <product title>:
     | Project | Role | ID |
     |---------|------|----|
     | <title> | <role> | <projectId> |
   ```

### Done when

- Project links verified via `product-get`
- Summary reported

---

## Idempotency

This skill checks for existing links before creating:

| Scenario                | Behavior                             |
| ----------------------- | ------------------------------------ |
| Project already linked  | Skip (idempotent)                    |
| Project doesn't exist   | Warn and skip                        |
| Different role on rerun | Existing link preserved, not updated |

---

## Error Handling

| Situation                   | Action                                      |
| --------------------------- | ------------------------------------------- |
| Project already linked      | Skip (idempotent)                           |
| Project doesn't exist       | Warn and skip                               |
| No projects in workspace    | Skip this step entirely                     |
| `product-add-project` fails | Log error, continue with remaining projects |

---

## Conventions

| Item            | Convention                                   |
| --------------- | -------------------------------------------- |
| Default role    | `supporting` when heuristic is ambiguous     |
| Batch size      | 7 parallel operations                        |
| Primary project | At most 1-2 projects should be `primary`     |
| Initiative link | Optional — only link if clear mapping exists |

---

_Created: 2026-03-30_
