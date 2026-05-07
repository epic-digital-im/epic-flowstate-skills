---
name: flowstate-product-link-teammembers
description: Use when associating org chart team members to a FlowState product with role assignments derived from org hierarchy and product type - loads team members, applies product-type RACI template (Desktop, Mobile, SaaS, API), and creates productteammembers records. Composable sub-skill used by flowstate-creating-a-product orchestrator.
---

# Product Link Team Members

**Status:** Active
**Purpose:** Associate all org chart team members to a product with role assignments derived from org hierarchy and product type
**Scope:** Any product that needs team member associations
**Trigger:** Product exists and team members need to be linked
**Input:** Product ID, product type (for template selection), `orgId`
**Output:** `productteammembers` record IDs

---

## Overview

Associates team members to a product using product-type-specific role templates. The template maps each team member's position in the org hierarchy to an appropriate product role (`lead`, `member`, `advisor`, `observer`).

```
Load Team Members -> Apply Role Template -> Create Links -> Verify
       (0)                  (1)                 (2)          (3)
```

**Schema reference:** [flowstate-product-schema](../flowstate-product-schema/SKILL.md)

---

## Prerequisites

Before starting:

- Product exists (you have the `productId` and know the product `type`)
- Team members exist in `teammembers` collection
- Org chart available at `.flowstate/agents/ORG_CHART.md` or team members queryable
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
   - `userEmail`
   - `role` (org-level: `owner`, `manager`, `contributor`, `viewer`)
   - `isAgent` (boolean)
   - Org level (L1-L7) from org chart or `extended.agent` metadata

3. If org chart file exists at `.flowstate/agents/ORG_CHART.md`, read it for hierarchy context

4. If no org chart, derive hierarchy from team member metadata:
   - `role: "owner"` → L1
   - Title/name containing CEO, CTO, CFO → L1-L2
   - Title containing VP, Director → L3-L4
   - Title containing Manager → L5
   - Title containing Senior → L6
   - Otherwise → L7

### Done when

- Complete team member list loaded
- Each member has an identified org level

---

## Step 1: Apply Product-Type Role Template

**Who:** Assigned agent
**Pause:** No

### Actions

Select the template based on product type:

### Software - Desktop Template

| Org Level                              | Example Roles                              | Product Role         |
| -------------------------------------- | ------------------------------------------ | -------------------- |
| L1 Owner                               | Spencer Thornock                           | `lead` (isPrimary)   |
| L1 Executive (CEO)                     | Marcus Chen                                | `advisor`            |
| L2 C-Suite (CTO)                       | Dr. Yuki Tanaka                            | `advisor`            |
| L3 VP (Engineering, Architecture)      | Santiago Reyes, Aleksandr Volkov           | `member` / `advisor` |
| L3 VP (Product)                        | Priya Sharma                               | `advisor`            |
| L4 Director (SW Dev, QA)               | Kenji Nakamura, Wei Chen                   | `member`             |
| L4 Director (UX, PM)                   | Ingrid Larsson, David Kim                  | `member` / `advisor` |
| L5 Manager (Frontend, Backend, DevOps) | Maya Rodriguez, Omar Hassan, Zara Okonkwo  | `member`             |
| L6 Senior IC (Engineering)             | Elena Vasquez, Viktor Petrov, Jin-Soo Park | `member`             |
| L6 Senior IC (Architecture, Security)  | Dr. Helena Frost, Cipher                   | `advisor` / `member` |
| L6 Senior IC (PM, UX)                  | Aisha Mohammed, Tomas Guerrero             | `member`             |
| L7 IC (QA, Automation, Scrum)          | Fatima Al-Rahman, Raj Patel, Jordan Taylor | `member`             |
| L7 IC (Content, Marketing)             | River Thompson                             | `observer`           |
| L7 IC (DevRel)                         | Simon Templar                              | `member`             |
| L7 IC (Data, Support)                  | Natasha Volkov, Sam Oduya                  | `observer`           |

### Software - Mobile Template

Same as Desktop with these adjustments:

- UX Director and Sr UX Designer elevated to `advisor` (mobile UX is critical)
- Dev Advocate elevated — app store presence matters
- QA Manager and Automation Lead remain `member` (testing is critical for mobile)

### SaaS / Platform Template

Same as Desktop with these adjustments:

- VP Architecture and Principal Architect are `advisor` (platform architecture critical)
- Security Engineer elevated to `advisor` (SaaS security critical)
- Data Analyst elevated to `member` (metrics-driven)

### API / Library Template

Lighter team — primarily backend engineering, architecture, security:

- Frontend roles become `observer`
- UX roles become `observer`
- Marketing/content become `observer`
- Backend engineering, architecture, security remain `member` or `advisor`

### Mapping org-level role to team role

| Product Role | Org-Level `role` Value |
| ------------ | ---------------------- |
| `lead`       | `owner`                |
| `advisor`    | `manager`              |
| `member`     | `contributor`          |
| `observer`   | `viewer`               |

### Done when

- Every team member has a product role assigned from the template
- `isPrimary` set to `true` for the owner only

---

## Step 2: Create Team Member Links

**Who:** Assigned agent
**Pause:** No

### Actions

1. For each team member, call `product-add-team-member`:

   ```
   product-add-team-member {
     productId: "<productId>",
     userName: "<display name>",
     userEmail: "<email>",
     role: "<org-level role>",
     productRole: "<derived product role>",
     isPrimary: <true for owner only>,
     isAgent: <true if AI agent>,
     orgId: "<orgId>"
   }
   ```

2. Process in batches of 7 for efficiency (7 parallel calls per batch)

3. Record each returned junction record ID

### Done when

- All team members linked to product
- Junction record IDs recorded

---

## Step 3: Verify

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query `productteammembers` for the product:

   ```
   collection-query productteammembers { "productId": "<productId>" }
   ```

2. Confirm count matches total team size

3. Report summary:

   ```
   Team linked to <product title>:
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

| Scenario                   | Behavior                         |
| -------------------------- | -------------------------------- |
| Team member already linked | Skip (idempotent)                |
| No team members found      | Error: seed team members first   |
| Org chart file missing     | Fall back to collection query    |
| Partial completion         | Rerun links only missing members |

---

## Error Handling

| Situation                       | Action                                      |
| ------------------------------- | ------------------------------------------- |
| Team member already linked      | Skip (idempotent)                           |
| No team members found           | Error: seed team members first              |
| Org chart file missing          | Fall back to `teammembers` collection query |
| `product-add-team-member` fails | Log error, continue with remaining members  |
| Unknown org level               | Default to `member` role                    |

---

## Conventions

| Item               | Convention                                        |
| ------------------ | ------------------------------------------------- |
| Batch size         | 7 parallel operations                             |
| Template selection | Based on product `type` field                     |
| Default role       | `member` when org level is ambiguous              |
| `isPrimary`        | Only `true` for the org owner (L1 Owner)          |
| Agent flag         | Set `isAgent: true` for all AI agent team members |

---

_Created: 2026-03-30_
