---
name: flowstate-creating-a-bizplan
description: Use when creating a complete FlowState business plan linked to a product with full team associations - orchestrates plan creation, product connection, and team member assignment using composable sub-skills. Full bizplan setup in one workflow.
---

# Creating a Business Plan

**Status:** Active
**Purpose:** Full business plan setup composing all sub-skills — create plan, link to product, associate team
**Scope:** Any new business plan that needs complete setup with market analysis, competitors, goals, financials, product link, and team associations
**Trigger:** New business plan needs to be created and fully linked in FlowState
**Input:** Plan definition + product ID (optional) + `orgId`
**Output:** Fully linked business plan with team associations and optional product connection

---

## Overview

This is the **orchestrator skill** that composes sub-skills to create a fully linked business plan in FlowState. Each sub-skill can also be used independently.

```
Gather Inputs -> Create Plan -> Link to Product -> Associate Team -> Verify
     (0)             (1)             (2)                (3)           (4)
```

### Sub-Skills Used

| Step | Sub-Skill                            | Purpose                                                 |
| ---- | ------------------------------------ | ------------------------------------------------------- |
| 1    | `flowstate-bizplan-create`           | Create plan + market + competitors + goals + financials |
| 2    | `flowstate-bizplan-link-product`     | Connect to product with shared goals                    |
| 3    | `flowstate-bizplan-link-teammembers` | Associate team with RACI assignments                    |

**Schema reference:** [flowstate-bizplan-schema](../flowstate-bizplan-schema/SKILL.md)

---

## Prerequisites

Before starting:

- Organization exists (`orgId`)
- `.flowstate/config.json` with `orgId` and `workspaceId`
- Product exists (if linking — have the `productId`)
- Team members exist in `teammembers` collection (if associating team)

---

## Step 0: Gather Inputs

**Who:** Assigned agent
**Pause:** Yes — confirm plan definition with user

### Actions

1. Read `orgId` and `workspaceId` from `.flowstate/config.json`

2. Collect plan definition:

   | Field                 | Required | Source                                              |
   | --------------------- | -------- | --------------------------------------------------- |
   | `title`               | Yes      | Plan name                                           |
   | `description`         | Yes      | Plan overview                                       |
   | `planType`            | Yes      | `startup`, `growth`, `pivot`, `annual`              |
   | `timeframeMonths`     | Yes      | Duration (e.g., 12)                                 |
   | `startDate`           | Yes      | ISO date string                                     |
   | Narrative fields      | Rec.     | Mission, vision, problem, solution, market, model   |
   | Market analysis       | Rec.     | TAM/SAM/SOM, SWOT, segments, trends                 |
   | Competitors (3-5)     | Rec.     | Name, strengths, weaknesses, threat level           |
   | Goals (3-5)           | Rec.     | Title, category, target, unit, metric type          |
   | Financial projections | Rec.     | Revenue categories, expenses, optional monthly rows |
   | `productId`           | No       | If linking to an existing product                   |

3. Determine which optional steps to run:
   - **Link to Product** — skip if no `productId`
   - **Associate Team** — skip if no team members in org

### Done when

- All required inputs collected
- Optional steps identified
- User has confirmed the plan definition

---

## Step 1: Create Business Plan

**Who:** Assigned agent
**Pause:** No

### Actions

Invoke **flowstate-bizplan-create** sub-skill:

1. Pass the full plan definition (title, type, timeframe, narrative, market, competitors, goals, financials)
2. Set `generateSummary: true` for automatic executive summary
3. Record the returned `businessPlanId`
4. Confirm market analysis, competitors, goals, and financials created

### Done when

- Business plan created with `businessPlanId`
- All relations verified (market, competitors, goals, financials)

---

## Step 2: Link to Product

**Who:** Assigned agent
**Pause:** No
**Skip if:** No `productId` provided

### Actions

Invoke **flowstate-bizplan-link-product** sub-skill:

1. Pass the `businessPlanId` and `productId`
2. Shared goals automatically linked between plan and product

### Done when

- Plan linked to product
- Shared goals confirmed
- Or step skipped (no product)

---

## Step 3: Associate Team

**Who:** Assigned agent
**Pause:** No
**Skip if:** No team members in org

### Actions

Invoke **flowstate-bizplan-link-teammembers** sub-skill:

1. Pass the `businessPlanId`
2. RACI template applied based on org hierarchy
3. All team members linked with phase-based RACI assignments

### Done when

- All team members linked to bizplan with RACI
- Count verified
- Or step skipped (no team)

---

## Step 4: Verify and Report

**Who:** Assigned agent
**Pause:** No

### Actions

1. Retrieve the full business plan:

   ```
   bizplan-get { businessPlanId: "<businessPlanId>", orgId: "<orgId>" }
   ```

2. Count all related entities:
   - Market analysis (1:1)
   - Competitors count
   - Goals count (from `metadata.goalIds`)
   - Revenue categories count
   - Team members (if associated)

3. If product linked, retrieve product:

   ```
   product-get { productId: "<productId>", orgId: "<orgId>" }
   ```

4. Report summary:

   ```
   Business Plan Created: <title> (<businessPlanId>)
     Type:        <planType>
     Status:      <status>
     Timeframe:   <timeframeMonths> months
     Market:      TAM $<tam> / SAM $<sam> / SOM $<som>
     Competitors: <count>
     Goals:       <count> (<shared count> shared with product)
     Financials:  <category count> categories, $<expenses>/mo
     Summary Doc: <summaryDocumentId>
     Product:     <productId or "not linked">
     Team:        <count> members with RACI
   ```

### Done when

- All counts verified
- Summary reported to user

---

## Error Handling

| Situation                    | Action                                           |
| ---------------------------- | ------------------------------------------------ |
| Plan creation fails          | Stop — cannot proceed without plan               |
| Product linking fails        | Log warning, skip team-to-product step if needed |
| Team linking partially fails | Report which members failed, continue with rest  |
| Already linked (any step)    | Idempotent — skip and continue                   |
| Missing `orgId`              | Error: read from `.flowstate/config.json`        |

---

## Conventions

| Item             | Convention                                             |
| ---------------- | ------------------------------------------------------ |
| Batch size       | 7 parallel operations for team member creation         |
| Step ordering    | Plan first, then product link, then team               |
| Skip logic       | Optional steps skipped cleanly with no errors          |
| Verification     | Always run final verify step                           |
| Summary format   | Structured report with counts for all related entities |
| Sub-skill invoke | Each sub-skill invoked via `Skill` tool                |
| Summary doc      | Always generated via `generateSummary: true`           |

---

_Created: 2026-03-30_
