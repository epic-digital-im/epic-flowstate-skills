---
name: flowstate-bizplan-create
description: Use when creating a FlowState business plan with market analysis, competitors, goals, and financial projections - gathers plan definition, calls bizplan-create MCP tool, and verifies all relations. Composable sub-skill used by flowstate-creating-a-bizplan orchestrator.
---

# Business Plan Create

**Status:** Active
**Purpose:** Create a complete business plan record with market analysis, competitors, goals, and financials in FlowState
**Scope:** Any new business plan that needs to be tracked in FlowState
**Trigger:** New business plan definition ready for registration
**Input:** Plan definition (title, type, timeframe, narrative, market, competitors, goals, financials), `orgId`
**Output:** Business plan ID, market analysis ID, competitor IDs, goal IDs, optional summary document ID

---

## Overview

Creates a complete business plan entity in FlowState using the `bizplan-create` MCP tool. This tool handles plan creation, market analysis, competitor entries, goal creation and linking, financial data, and optional executive summary generation in a single call.

```
Gather Definition -> Define Market -> Define Competitors -> Define Goals -> Define Financials -> Create Plan -> Verify
       (0)               (1)               (2)                 (3)              (4)                (5)          (6)
```

**Schema reference:** [flowstate-bizplan-schema](../flowstate-bizplan-schema/SKILL.md)

---

## Prerequisites

Before starting:

- Organization exists (`orgId`)
- `.flowstate/config.json` with `orgId`
- `workspaceId` optional but recommended

---

## Step 0: Gather Plan Definition

**Who:** Assigned agent
**Pause:** No

### Actions

1. Collect from the user or derive from context:

   | Field                  | Required | Description                            |
   | ---------------------- | -------- | -------------------------------------- |
   | `title`                | Yes      | Plan name                              |
   | `description`          | Yes      | Plan overview                          |
   | `planType`             | Yes      | `startup`, `growth`, `pivot`, `annual` |
   | `timeframeMonths`      | Yes      | Duration in months (e.g., 12)          |
   | `startDate`            | Yes      | ISO date string                        |
   | `missionStatement`     | No       | Core purpose                           |
   | `visionStatement`      | No       | Future state                           |
   | `problemStatement`     | No       | Pain point being addressed             |
   | `solutionSummary`      | No       | How the product/service solves it      |
   | `targetMarket`         | No       | Customer description                   |
   | `revenueModel`         | No       | How money is made                      |
   | `competitiveAdvantage` | No       | Key differentiators                    |

2. Read `orgId` and `workspaceId` from `.flowstate/config.json`

3. If user provides only a product/company description, infer:
   - `planType` from context (new = `startup`, existing = `growth`, changing = `pivot`)
   - Narrative fields from the description
   - Ask user to validate assumptions before proceeding

### Done when

- All required fields collected
- Narrative fields populated (all recommended)
- `orgId` confirmed valid

---

## Step 1: Define Market Analysis

**Who:** Assigned agent
**Pause:** No

### Actions

1. Define market sizing:

   | Field      | Description                                                    |
   | ---------- | -------------------------------------------------------------- |
   | `tam`      | Total Addressable Market — total demand if 100% share          |
   | `sam`      | Serviceable Addressable Market — reachable with current model  |
   | `som`      | Serviceable Obtainable Market — realistic near-term (1-5% SAM) |
   | `currency` | `USD`, `EUR`, `GBP`, `CAD`, `AUD`                              |
   | `year`     | Year for market size data                                      |

2. Define SWOT analysis (3-5 items per quadrant):

   | Quadrant          | Focus    | Examples                                   |
   | ----------------- | -------- | ------------------------------------------ |
   | **Strengths**     | Internal | Technical expertise, first-mover advantage |
   | **Weaknesses**    | Internal | Limited funding, small team                |
   | **Opportunities** | External | Growing market, regulatory changes         |
   | **Threats**       | External | Established competitors, economic downturn |

3. Define target segments (1+ minimum):
   - Name, size, characteristics, pain points

4. Define market trends (2-5)

### Done when

- TAM/SAM/SOM estimates defined
- SWOT has 3+ items per quadrant
- At least 1 target segment defined

---

## Step 2: Define Competitors

**Who:** Assigned agent
**Pause:** No

### Actions

1. Identify 3-5 competitors. For each:

   | Field             | Required | Description             |
   | ----------------- | -------- | ----------------------- |
   | `name`            | Yes      | Competitor name         |
   | `description`     | Yes      | Overview                |
   | `strengths`       | Yes      | Array of strengths      |
   | `weaknesses`      | Yes      | Array of weaknesses     |
   | `threatLevel`     | Yes      | `low`, `medium`, `high` |
   | `website`         | No       | Competitor URL          |
   | `pricing`         | No       | Pricing model           |
   | `marketShare`     | No       | Market share estimate   |
   | `differentiators` | No       | Key differentiators     |

2. Assign threat levels:
   - `high` — direct competitor, similar offering, strong position
   - `medium` — overlapping market, different approach
   - `low` — tangential or potential future entrant

### Done when

- 3-5 competitors defined with required fields
- Threat levels assigned

---

## Step 3: Define Goals

**Who:** Assigned agent
**Pause:** No

### Actions

1. Define 3-5 strategic goals across different categories:

   | Field         | Required | Description                                            |
   | ------------- | -------- | ------------------------------------------------------ |
   | `title`       | Yes      | Goal name                                              |
   | `category`    | Yes      | `Revenue`, `Growth`, `Quality`, `Efficiency`, `Custom` |
   | `targetValue` | Yes      | Numeric target                                         |
   | `unit`        | Yes      | e.g., `USD`, `%`, `users`                              |
   | `metricType`  | Yes      | `percentage`, `currency`, `count`, `custom`            |
   | `priority`    | No       | 1 (highest) to 5 (lowest)                              |

2. Recommended goal mix:

   | Category     | Example                    | Metric Type  |
   | ------------ | -------------------------- | ------------ |
   | `Revenue`    | Reach $50K MRR             | `currency`   |
   | `Growth`     | Acquire 1000 users         | `count`      |
   | `Quality`    | Maintain 99.9% uptime      | `percentage` |
   | `Efficiency` | Reduce onboarding to 5 min | `count`      |
   | `Custom`     | Secure Series A funding    | `currency`   |

### Done when

- 3-5 goals defined with titles, categories, and metrics
- Goals cover different categories

---

## Step 4: Define Financial Projections

**Who:** Assigned agent
**Pause:** No

### Actions

1. Define revenue categories (streams of income):
   - e.g., `["Subscriptions", "Services", "Licensing"]`

2. Set monthly expenses (fixed burn rate):
   - e.g., `15000`

3. Optionally define month-by-month revenue projections:
   - Generate month labels from `startDate` through `timeframeMonths`
   - Each row: `{ month: "YYYY-MM", categories: { "Subscriptions": N, "Services": N } }`

4. If monthly projections not available, pass empty `monthlyRows` and set `generateEmptyRows: true` in the MCP tool call to auto-generate empty rows

### Done when

- Revenue categories defined
- Monthly expenses set
- Optional: monthly revenue projections defined

---

## Step 5: Create Business Plan

**Who:** Assigned agent
**Pause:** No

### Actions

1. Call `bizplan-create` with the full definition:

   ```
   bizplan-create {
     orgId: "<orgId>",
     title: "<title>",
     description: "<description>",
     planType: "<type>",
     timeframeMonths: <months>,
     startDate: "<ISO date>",
     missionStatement: "<optional>",
     visionStatement: "<optional>",
     problemStatement: "<optional>",
     solutionSummary: "<optional>",
     targetMarket: "<optional>",
     revenueModel: "<optional>",
     competitiveAdvantage: "<optional>",
     market: {
       tam: <n>, sam: <n>, som: <n>,
       currency: "USD", year: 2026,
       swot: { strengths: [...], weaknesses: [...], opportunities: [...], threats: [...] },
       segments: [...],
       trends: [...]
     },
     competitors: [
       { name: "...", description: "...", strengths: [...], weaknesses: [...], threatLevel: "high" },
       ...
     ],
     goals: [
       { title: "...", category: "Revenue", targetValue: 1000000, unit: "USD", metricType: "currency" },
       ...
     ],
     financials: {
       revenueCategories: ["Subscriptions", "Services"],
       monthlyExpenses: 15000,
       monthlyRows: [...]
     },
     generateSummary: true
   }
   ```

2. Record the returned IDs:
   - `businessPlanId` — the primary plan record
   - `marketAnalysisId` — from the response
   - `competitorIds` — array from the response
   - `goalIds` — array from the response
   - `summaryDocumentId` — if `generateSummary: true`

### Done when

- `bizplan-create` call succeeds
- Business plan ID recorded
- All related entity IDs recorded

---

## Step 6: Verify

**Who:** Assigned agent
**Pause:** No

### Actions

1. Retrieve business plan via `bizplan-get`:

   ```
   bizplan-get { businessPlanId: "<businessPlanId>", orgId: "<orgId>" }
   ```

2. Confirm all relations created:
   - Market analysis exists with TAM/SAM/SOM
   - Competitor count matches definition (3-5)
   - Goal count matches definition (3-5)
   - Financial data populated (revenue categories, expenses)
   - Executive summary document exists (if requested)

3. Report summary:

   ```
   Business Plan Created: <title> (<businessPlanId>)
     Type:        <planType>
     Status:      <status>
     Timeframe:   <timeframeMonths> months
     Market:      TAM $<tam> / SAM $<sam> / SOM $<som>
     Competitors: <count>
     Goals:       <count>
     Financials:  <category count> categories, $<expenses>/mo expenses
     Summary Doc: <summaryDocumentId or "not generated">
   ```

### Done when

- Business plan verified via `bizplan-get`
- All relations confirmed
- Summary reported

---

## Error Handling

| Situation                 | Action                                                                     |
| ------------------------- | -------------------------------------------------------------------------- |
| Plan title already exists | Query existing, ask user to reuse or rename                                |
| Goal creation fails       | Create goals separately via `bizplan-add-goal`                             |
| Market analysis missing   | Create separately via `collection-create marketanalyses`                   |
| Competitor creation fails | Add individually via `bizplan-add-competitor`                              |
| Financial data incomplete | Update later via `bizplan-update-financials`                               |
| Summary generation fails  | Regenerate via `bizplan-generate-summary`                                  |
| `orgId` invalid           | Verify org exists via `collection-get orgs`                                |
| Partial creation          | Use `bizplan-get` to see what was created, fill gaps with individual tools |

---

## Conventions

| Item              | Convention                                                   |
| ----------------- | ------------------------------------------------------------ |
| Plan ID format    | `bpln_XXXXXXXXXX`                                            |
| Competitor count  | 3-5 minimum                                                  |
| Goal count        | 3-5 across different categories                              |
| SWOT items        | 3-5 per quadrant                                             |
| Target segments   | 1+ minimum                                                   |
| Batch creation    | Use single `bizplan-create` call, not manual 7-step workflow |
| Verification      | Always call `bizplan-get` after creation                     |
| Executive summary | Set `generateSummary: true` for automatic generation         |

---

_Created: 2026-03-30_
