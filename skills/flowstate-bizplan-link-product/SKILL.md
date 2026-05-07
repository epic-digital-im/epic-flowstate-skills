---
name: flowstate-bizplan-link-product
description: Use when connecting a FlowState product to a business plan with shared goals - verifies both entities exist, calls bizplan-link-product MCP tool, and confirms goal sharing. Composable sub-skill used by flowstate-creating-a-product orchestrator.
---

# Bizplan Link Product

**Status:** Active
**Purpose:** Connect a product to a business plan with shared goals
**Scope:** Any product that should be linked to a business plan for strategic alignment
**Trigger:** Product and business plan both exist and need linking
**Input:** Business plan ID, Product ID, `orgId`
**Output:** Linkage confirmation, shared goal IDs

---

## Overview

Links a product to a business plan, enabling shared goals between the two entities. The `bizplan-link-product` MCP tool handles creating `productgoals` junction records for all existing bizplan goals.

```
Verify Both Exist -> Link with Goal Sharing -> Verify
       (0)                   (1)                 (2)
```

**Schema reference:** [flowstate-product-schema](../flowstate-product-schema/SKILL.md)

---

## Prerequisites

Before starting:

- Business plan exists (you have the `businessPlanId`)
- Product exists (you have the `productId`)
- `orgId` from `.flowstate/config.json`

---

## Step 0: Verify Both Exist

**Who:** Assigned agent
**Pause:** No

### Actions

1. Retrieve the business plan:

   ```
   bizplan-get { businessPlanId: "<bizplanId>", orgId: "<orgId>" }
   ```

2. Retrieve the product:

   ```
   product-get { productId: "<productId>", orgId: "<orgId>" }
   ```

3. Confirm both exist and note:
   - Business plan title and goal count
   - Product title and existing goal count

### Done when

- Both entities confirmed to exist
- Current state documented

---

## Step 1: Link with Goal Sharing

**Who:** Assigned agent
**Pause:** No

### Actions

1. Call `bizplan-link-product`:

   ```
   bizplan-link-product {
     businessPlanId: "<bizplanId>",
     productId: "<productId>",
     shareGoals: true,
     orgId: "<orgId>"
   }
   ```

   This automatically:
   - Links existing bizplan goals to the product
   - Creates `productgoals` junction records for shared goals

### Done when

- `bizplan-link-product` call succeeds
- Link created

---

## Step 2: Verify

**Who:** Assigned agent
**Pause:** No

### Actions

1. Retrieve product via `product-get`:

   ```
   product-get { productId: "<productId>", orgId: "<orgId>" }
   ```

2. Confirm:
   - Product shows linked business plan
   - Shared goals appear in product goals list

3. Report summary:

   ```
   Product linked to Business Plan:
     Product:    <product title> (<productId>)
     Bizplan:    <bizplan title> (<bizplanId>)
     Shared Goals: <count>
   ```

### Done when

- Link verified via `product-get`
- Shared goals confirmed
- Summary reported

---

## Error Handling

| Situation             | Action                                                             |
| --------------------- | ------------------------------------------------------------------ |
| Bizplan doesn't exist | Error: provide valid bizplan ID                                    |
| Product doesn't exist | Error: create product first                                        |
| Already linked        | Idempotent — no error, no change                                   |
| Goal sharing fails    | Link without sharing, create goals manually via `product-add-goal` |

---

## Conventions

| Item         | Convention                              |
| ------------ | --------------------------------------- |
| Goal sharing | Always `shareGoals: true` by default    |
| Verification | Always call `product-get` after linking |
| Idempotency  | Safe to call multiple times             |

---

_Created: 2026-03-30_
