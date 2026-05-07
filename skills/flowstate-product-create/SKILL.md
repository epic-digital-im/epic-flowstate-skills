---
name: flowstate-product-create
description: Use when creating a FlowState product with goals, roadmap, and initiatives - gathers product definition, calls product-create MCP tool, and verifies all relations. Requires existing org. Composable sub-skill used by flowstate-creating-a-product orchestrator.
---

# Product Create

**Status:** Active
**Purpose:** Create a product record with goals, roadmap, and initiatives in FlowState
**Scope:** Any new product that needs to be tracked in FlowState
**Trigger:** New product definition ready for registration
**Input:** Product definition (name, title, type, description, phase, goals, roadmap with initiatives), `orgId`
**Output:** Product ID, goal IDs, roadmap ID, initiative IDs

---

## Overview

Creates a complete product entity in FlowState using the `product-create` MCP tool. This tool handles product creation, goal creation and linking, roadmap creation, and initiative creation in a single call.

```
Gather Definition -> Define Goals -> Define Roadmap -> Create Product -> Verify
       (0)               (1)             (2)               (3)           (4)
```

**Schema reference:** [flowstate-product-schema](../flowstate-product-schema/SKILL.md)

---

## Prerequisites

Before starting:

- Organization exists (`orgId`)
- Workspace exists (`workspaceId`) -- optional but recommended
- Business plan exists if linking is planned (for shared goals alignment)

---

## Step 0: Gather Product Definition

**Who:** Assigned agent
**Pause:** No

### Actions

1. Collect from the user or derive from context:

   | Field                  | Required | Source                                                 |
   | ---------------------- | -------- | ------------------------------------------------------ |
   | `name`                 | Yes      | Slug-style: `flowstate-desktop`                        |
   | `title`                | Yes      | Display: `FlowState Desktop`                           |
   | `description`          | Yes      | User-provided or derived                               |
   | `type`                 | Yes      | `software`, `physical`, `service`, `content`, `custom` |
   | `currentPhase`         | Yes      | Starting phase from lifecycle                          |
   | `problemStatement`     | No       | What problem does this solve                           |
   | `valueProposition`     | No       | Why choose this product                                |
   | `targetMarket`         | No       | Array of market segments                               |
   | `customerPersona`      | No       | Target user description                                |
   | `competitiveLandscape` | No       | Competitive positioning                                |

2. Read `orgId` and `workspaceId` from the nearest `.flowstate/config.json`

### Done when

- All required fields collected
- `orgId` confirmed valid

---

## Step 1: Define Goals

**Who:** Assigned agent
**Pause:** No

### Actions

1. Define 3-5 strategic goals for the product:

   | Field         | Required | Description                                            |
   | ------------- | -------- | ------------------------------------------------------ |
   | `title`       | Yes      | Goal name                                              |
   | `category`    | Yes      | `Revenue`, `Growth`, `Quality`, `Efficiency`, `Custom` |
   | `targetValue` | No       | Numeric target                                         |
   | `unit`        | No       | e.g., `%`, `users`, `USD`                              |
   | `metricType`  | No       | `percentage`, `currency`, `count`, `custom`            |

2. If aligning with a business plan, review bizplan goals for consistency

### Done when

- 3-5 goals defined with titles and categories
- Goals align with product strategy

---

## Step 2: Define Roadmap and Initiatives

**Who:** Assigned agent
**Pause:** No

### Actions

1. Structure roadmap with quarterly initiatives:

   | Field                 | Required | Description                                 |
   | --------------------- | -------- | ------------------------------------------- |
   | `title`               | Yes      | Roadmap title (e.g., `2026 Roadmap`)        |
   | `timeframe`           | Yes      | e.g., `2026`                                |
   | Initiative `name`     | Yes      | Initiative slug                             |
   | Initiative `quarter`  | Yes      | e.g., `Q2 2026`                             |
   | Initiative `status`   | Yes      | `Backlog`, `Planned`, `In Progress`, `Done` |
   | Initiative `priority` | Yes      | `High`, `Medium`, `Low`                     |

2. Group initiatives by quarter for clarity

### Done when

- Roadmap defined with title and timeframe
- Initiatives defined with quarters, status, and priority

---

## Step 3: Create Product

**Who:** Assigned agent
**Pause:** No

### Actions

1. Call `product-create` with the full definition:

   ```
   product-create {
     name: "<slug>",
     title: "<display>",
     description: "<description>",
     type: "<type>",
     currentPhase: "<phase>",
     orgId: "<orgId>",
     workspaceId: "<workspaceId>",
     problemStatement: "<optional>",
     valueProposition: "<optional>",
     targetMarket: ["<optional>"],
     customerPersona: "<optional>",
     competitiveLandscape: "<optional>",
     goals: [
       { title: "<goal>", category: "<cat>", targetValue: <n>, unit: "<u>", metricType: "<mt>" },
       ...
     ],
     roadmap: {
       title: "<Roadmap Title>",
       timeframe: "<timeframe>",
       initiatives: [
         { name: "<slug>", quarter: "<Q>", status: "<status>", priority: "<priority>" },
         ...
       ]
     }
   }
   ```

2. Record the returned IDs:
   - `productId` — the primary product record
   - Goal IDs — from the response
   - Roadmap ID — from the response
   - Initiative IDs — from the response

### Done when

- `product-create` call succeeds
- Product ID recorded

---

## Step 4: Verify

**Who:** Assigned agent
**Pause:** No

### Actions

1. Retrieve product via `product-get`:

   ```
   product-get { productId: "<productId>", orgId: "<orgId>" }
   ```

2. Confirm all relations created:
   - Goals count matches definition
   - Roadmap exists with correct timeframe
   - Initiatives count matches definition

3. Report summary:

   ```
   Product Created: <title> (<productId>)
     Type:        <type>
     Phase:       <currentPhase>
     Goals:       <count>
     Initiatives: <count>
   ```

### Done when

- Product verified via `product-get`
- All relations confirmed
- Summary reported

---

## Error Handling

| Situation                   | Action                                                                         |
| --------------------------- | ------------------------------------------------------------------------------ |
| Product name already exists | Query existing, ask user to reuse or rename                                    |
| Goal creation fails         | Create goals separately via `product-add-goal`                                 |
| Roadmap missing             | Create separately, link via product update                                     |
| `orgId` invalid             | Verify org exists via `collection-get orgs`                                    |
| Partial creation            | Use `product-get` to see what was created, fill gaps with individual add tools |

---

## Conventions

| Item              | Convention                                             |
| ----------------- | ------------------------------------------------------ |
| Product name      | Slug-style: `flowstate-desktop`                        |
| Goal count        | 3-5 per product                                        |
| Initiative naming | Slug-style matching quarter: `q2-mvp-release`          |
| Batch creation    | Use single `product-create` call, not individual tools |
| Verification      | Always call `product-get` after creation               |

---

_Created: 2026-03-30_
