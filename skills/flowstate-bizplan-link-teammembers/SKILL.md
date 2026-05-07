---
name: flowstate-bizplan-link-teammembers
description: Use when associating org chart team members to a FlowState business plan with RACI assignments - loads team members, applies hierarchy-based RACI template, and creates businessplanteammembers records. Composable sub-skill used by flowstate-creating-a-product orchestrator.
---

# Bizplan Link Team Members

**Status:** Active
**Purpose:** Associate all org chart team members to a business plan with RACI assignments
**Scope:** Any business plan that needs team member associations
**Trigger:** Business plan exists and team members need to be linked with RACI roles
**Input:** Business plan ID, `orgId`
**Output:** `businessplanteammembers` record IDs with RACI assignments

---

## Overview

Associates team members to a business plan using a hierarchy-based RACI template. Each team member gets a plan role (`lead`, `member`, `advisor`, `observer`) and RACI assignments for business plan phases.

```
Load Team Members -> Apply RACI Template -> Create Links -> Verify
       (0)                  (1)                 (2)          (3)
```

**Schema reference:** [flowstate-product-schema](../flowstate-product-schema/SKILL.md)

---

## Prerequisites

Before starting:

- Business plan exists (you have the `businessPlanId`)
- Team members exist in `teammembers` collection
- `orgId` from `.flowstate/config.json`

---

## Step 0: Load Team Members

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query all team members:

   ```
   collection-query teammembers { "orgId": "<orgId>" }
   ```

2. For each team member, identify:
   - `id` (team member ID)
   - `userName` (display name)
   - Org level (L1-L7) from org chart or metadata

3. If org chart file exists at `.flowstate/agents/ORG_CHART.md`, read it for hierarchy context

4. Check for existing `businessplanteammembers` records to avoid duplicates:

   ```
   collection-query businessplanteammembers { "businessPlanId": "<bizplanId>" }
   ```

### Done when

- Complete team member list loaded with org levels
- Existing bizplan team links identified

---

## Step 1: Apply Bizplan Role and RACI Template

**Who:** Assigned agent
**Pause:** No

### Actions

Apply RACI assignments based on org hierarchy:

| Org Level                 | Plan Role          | RACI Pattern                         |
| ------------------------- | ------------------ | ------------------------------------ |
| L1 Owner                  | `lead` (isPrimary) | O on all phases                      |
| L1 Executive (CEO)        | `lead`             | O on strategy, A on financial        |
| L2 C-Suite (CTO)          | `advisor`          | R on technical, A on architecture    |
| L3 VP (Product)           | `advisor`          | O on product strategy, R on roadmap  |
| L3 VP (Engineering)       | `member`           | R on engineering, A on delivery      |
| L3 VP (Architecture)      | `advisor`          | R on architecture, C on technical    |
| L4 Director               | `member`           | R on department areas, I on strategy |
| L5 Manager                | `member`           | C on department areas, I on strategy |
| L6 Senior IC              | `member`           | C on specialization, I on phases     |
| L7 IC (Engineering)       | `member`           | I on relevant phases                 |
| L7 IC (Marketing/Content) | `member`           | C on marketing, I on other           |
| L7 IC (Support/Data)      | `member`           | I on all phases                      |

### RACI Keys

- **O** = Owner (drives the work)
- **R** = Reviewer (reviews deliverables)
- **A** = Approver (sign-off authority)
- **I** = Informed (kept in the loop)
- **C** = Consulted (provides input)

### RACI Phase Keys

Use these keys in `raciAssignments`:

| Phase Key              | Description                    |
| ---------------------- | ------------------------------ |
| `phase1_business_plan` | Business plan strategy         |
| `phase2_product`       | Product definition and roadmap |
| `phase3_projects`      | Project execution              |
| `phase4_bizdev`        | Business development           |
| `phase5_sales`         | Sales pipeline                 |
| `phase6_marketing`     | Marketing campaigns            |
| `phase7_content`       | Content creation               |
| `phase8_support`       | Customer support               |

### Done when

- Every team member has a plan role and RACI assignments
- `isPrimary` set for the org owner only

---

## Step 2: Create Team Member Links

**Who:** Assigned agent
**Pause:** No

### Actions

1. Skip any team members already linked (from Step 0 check)

2. For each new team member, call `bizplan-add-team-member`:

   ```
   bizplan-add-team-member {
     businessPlanId: "<bizplanId>",
     teamMemberId: "<teamMemberId>",
     planRole: "<lead|member|advisor|observer>",
     isPrimary: <true for owner only>,
     raciAssignments: {
       "phase1_business_plan": "<O|R|A|I|C>",
       "phase2_product": "<O|R|A|I|C>",
       ...
     },
     orgId: "<orgId>"
   }
   ```

3. Process in batches of 7 for efficiency (7 parallel calls per batch)

4. Record each returned junction record ID

### Done when

- All team members linked to business plan
- Junction record IDs recorded

---

## Step 3: Verify

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query `businessplanteammembers` for the bizplan:

   ```
   collection-query businessplanteammembers { "businessPlanId": "<bizplanId>" }
   ```

2. Confirm count matches total team size

3. Report summary:

   ```
   Team linked to Business Plan <bizplan title>:
     Total: <count> members
     Lead:     <count>
     Member:   <count>
     Advisor:  <count>
     Observer: <count>
   ```

### Done when

- Team member count verified
- Summary reported

---

## Idempotency

| Scenario                   | Behavior                                    |
| -------------------------- | ------------------------------------------- |
| Team member already linked | Skip (idempotent)                           |
| No team members found      | Error: seed team members first              |
| Partial completion         | Rerun only links missing members            |
| RACI assignments differ    | Existing assignments preserved, not updated |

---

## Error Handling

| Situation                       | Action                                      |
| ------------------------------- | ------------------------------------------- |
| Team member already linked      | Skip (idempotent)                           |
| No team members found           | Error: seed team members first              |
| Org chart file missing          | Fall back to `teammembers` collection query |
| `bizplan-add-team-member` fails | Log error, continue with remaining members  |
| Bizplan doesn't exist           | Error: provide valid business plan ID       |

---

## Conventions

| Item              | Convention                                                   |
| ----------------- | ------------------------------------------------------------ |
| Batch size        | 7 parallel operations                                        |
| RACI keys         | Phase-based: `phase1_business_plan` through `phase8_support` |
| Default plan role | `member` when org level is ambiguous                         |
| `isPrimary`       | Only `true` for the org owner (L1 Owner)                     |
| Duplicate check   | Always query existing links before creating                  |

---

_Created: 2026-03-30_
