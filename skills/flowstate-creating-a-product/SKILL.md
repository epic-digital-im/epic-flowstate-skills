---
name: flowstate-creating-a-product
description: Use when creating a complete FlowState product linked to a business plan with full team associations - orchestrates product creation, project linking, bizplan connection, and team member assignment using 6 composable sub-skills. Full product setup in one workflow.
---

# Creating a Product

**Status:** Active
**Purpose:** Full product setup composing all sub-skills — create product, link projects, connect to bizplan, associate team
**Scope:** Any new product that needs complete setup with goals, roadmap, projects, bizplan link, and team associations
**Trigger:** New product needs to be created and fully linked in FlowState
**Input:** Product definition + bizplan ID (optional) + project list (optional) + `orgId`
**Output:** Fully linked product with team associations on both product and bizplan

---

## Overview

This is the **orchestrator skill** that composes 6 sub-skills to create a fully linked product in FlowState. Each sub-skill can also be used independently.

```
Gather Inputs -> Create Product -> Link Projects -> Link to Bizplan -> Team to Product -> Team to Bizplan -> Verify
     (0)             (1)              (2)               (3)                (4)                (5)             (6)
```

### Sub-Skills Used

| Step | Sub-Skill                            | Purpose                              |
| ---- | ------------------------------------ | ------------------------------------ |
| 1    | `flowstate-product-create`           | Create product + goals + roadmap     |
| 2    | `flowstate-product-link-projects`    | Link existing projects               |
| 3    | `flowstate-bizplan-link-product`     | Connect to bizplan with shared goals |
| 4    | `flowstate-product-link-teammembers` | Associate team to product            |
| 5    | `flowstate-bizplan-link-teammembers` | Associate team to bizplan with RACI  |

**Schema reference:** [flowstate-product-schema](../flowstate-product-schema/SKILL.md)

---

## Prerequisites

Before starting:

- Organization exists (`orgId`)
- `.flowstate/config.json` with `orgId` and `workspaceId`
- Business plan exists (if linking — have the `businessPlanId`)
- Team members exist in `teammembers` collection (if associating team)
- Projects exist in FlowState (if linking projects)

---

## Step 0: Gather Inputs

**Who:** Assigned agent
**Pause:** Yes — confirm product definition with user

### Actions

1. Read `orgId` and `workspaceId` from `.flowstate/config.json`

2. Collect product definition:

   | Field                 | Required | Source                                                 |
   | --------------------- | -------- | ------------------------------------------------------ |
   | `name`                | Yes      | Slug-style: `flowstate-desktop`                        |
   | `title`               | Yes      | Display: `FlowState Desktop`                           |
   | `description`         | Yes      | User-provided or derived                               |
   | `type`                | Yes      | `software`, `physical`, `service`, `content`, `custom` |
   | `currentPhase`        | Yes      | Starting lifecycle phase                               |
   | Goals (3-5)           | Yes      | Title, category, target, unit                          |
   | Roadmap + initiatives | Yes      | Title, timeframe, quarterly initiatives                |
   | `businessPlanId`      | No       | If linking to a bizplan                                |
   | Project list          | No       | If linking existing projects                           |

3. Determine which optional steps to run:
   - **Link Projects** — skip if no projects to link
   - **Link to Bizplan** — skip if no `businessPlanId`
   - **Team to Bizplan** — skip if no `businessPlanId` or team already linked

### Done when

- All required inputs collected
- Optional steps identified
- User has confirmed the product definition

---

## Step 1: Create Product

**Who:** Assigned agent
**Pause:** No

### Actions

Invoke **flowstate-product-create** sub-skill:

1. Pass the full product definition (name, title, type, phase, goals, roadmap)
2. Record the returned `productId`
3. Confirm goals and roadmap created

### Done when

- Product created with `productId`
- Goals and roadmap verified

---

## Step 2: Link Projects

**Who:** Assigned agent
**Pause:** No
**Skip if:** No projects to link

### Actions

Invoke **flowstate-product-link-projects** sub-skill:

1. Pass the `productId` and project list (or auto-discover)
2. Each project gets a role: `primary`, `supporting`, or `related`

### Done when

- All projects linked to product
- Or step skipped (no projects)

---

## Step 3: Link to Business Plan

**Who:** Assigned agent
**Pause:** No
**Skip if:** No `businessPlanId` provided

### Actions

Invoke **flowstate-bizplan-link-product** sub-skill:

1. Pass the `businessPlanId` and `productId`
2. Shared goals automatically created

### Done when

- Product linked to bizplan
- Shared goals confirmed
- Or step skipped (no bizplan)

---

## Step 4: Associate Team to Product

**Who:** Assigned agent
**Pause:** No

### Actions

Invoke **flowstate-product-link-teammembers** sub-skill:

1. Pass the `productId` and product `type`
2. Template auto-selects based on product type (Desktop, Mobile, SaaS, API)
3. All team members linked with appropriate product roles

### Done when

- All team members linked to product
- Count verified

---

## Step 5: Associate Team to Business Plan

**Who:** Assigned agent
**Pause:** No
**Skip if:** No `businessPlanId` or team already linked to bizplan

### Actions

Invoke **flowstate-bizplan-link-teammembers** sub-skill:

1. Pass the `businessPlanId`
2. RACI template applied based on org hierarchy
3. All team members linked with RACI assignments

### Done when

- All team members linked to bizplan with RACI
- Count verified
- Or step skipped

---

## Step 6: Verify and Report

**Who:** Assigned agent
**Pause:** No

### Actions

1. Retrieve the full product:

   ```
   product-get { productId: "<productId>", orgId: "<orgId>" }
   ```

2. Count all junction records:
   - `productgoals` count
   - `productteammembers` count
   - `productprojects` count
   - Roadmap and initiatives count

3. If bizplan linked, retrieve bizplan:

   ```
   bizplan-get { businessPlanId: "<bizplanId>", orgId: "<orgId>" }
   ```

4. Report summary:

   ```
   Product Created: <title> (<productId>)
     Type:        <type>
     Phase:       <currentPhase>
     Goals:       <count> (<shared count> shared with bizplan)
     Initiatives: <count> across roadmap
     Projects:    <count> linked
     Team:        <count> members on product
     Bizplan:     <bizplanId> (<count> members with RACI)
   ```

### Done when

- All counts verified
- Summary reported to user

---

## Error Handling

| Situation                    | Action                                          |
| ---------------------------- | ----------------------------------------------- |
| Product creation fails       | Stop — cannot proceed without product           |
| Project linking fails        | Log warning, continue with remaining steps      |
| Bizplan linking fails        | Log warning, skip bizplan team step too         |
| Team linking partially fails | Report which members failed, continue with rest |
| Already linked (any step)    | Idempotent — skip and continue                  |
| Missing `orgId`              | Error: read from `.flowstate/config.json`       |

---

## Conventions

| Item             | Convention                                             |
| ---------------- | ------------------------------------------------------ |
| Batch size       | 7 parallel operations for team member creation         |
| Step ordering    | Product first, then projects, then bizplan, then team  |
| Skip logic       | Optional steps skipped cleanly with no errors          |
| Verification     | Always run final verify step                           |
| Summary format   | Structured report with counts for all junction records |
| Sub-skill invoke | Each sub-skill invoked via `Skill` tool                |

---

_Created: 2026-03-30_
