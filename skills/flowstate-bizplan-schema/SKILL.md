---
name: flowstate-bizplan-schema
description: Use when creating FlowState business plans, querying plan data, updating financials, adding competitors or goals, or understanding bizplan collection relationships - provides business plan collection schema, related collections, enums, MCP tools, and field reference
---

# Business Plan Schema

**Status:** Active
**Collection:** `businessplans` (native collection)
**ID Prefix:** `bpln_`
**Hierarchy Level:** Cross-cutting (linked to org, workspace, goals, competitors, market analysis, documents)

---

## Overview

A **business plan** is FlowState's unit of strategic planning. Business plans aggregate market analysis, competitors, goals, financial forecasts, and executive summary documents. Plans can be linked to products for end-to-end planning.

```
Org
└── Workspace
    └── Business Plan  ← this document
        ├── Market Analysis (marketanalyses) ─── 1:1 via businessPlanId
        ├── Competitors (competitors) ─── 1:many via businessPlanId
        ├── Goals (goals) ─── many:many via metadata.goalIds[]
        ├── Documents (documents) ─── loosely associated
        └── Financial Data (embedded in metadata)
```

---

## Collections

### `businessplans` (Core Record)

| Field                  | Type   | Required | Description                                                               |
| ---------------------- | ------ | -------- | ------------------------------------------------------------------------- |
| `title`                | string | Yes      | Plan name                                                                 |
| `description`          | string | Yes      | Plan overview/abstract                                                    |
| `planType`             | string | Yes      | `startup`, `growth`, `pivot`, `annual`                                    |
| `status`               | string | Yes      | `draft`, `active`, `archived`                                             |
| `timeframeMonths`      | number | Yes      | Plan duration in months                                                   |
| `startDate`            | string | Yes      | ISO date string                                                           |
| `endDate`              | string | No       | Computed from startDate + timeframeMonths                                 |
| `orgId`                | string | Yes      | Parent organization ID                                                    |
| `workspaceId`          | string | No       | Parent workspace ID                                                       |
| `missionStatement`     | string | No       | Core purpose                                                              |
| `visionStatement`      | string | No       | Future state                                                              |
| `problemStatement`     | string | No       | Pain point being addressed                                                |
| `solutionSummary`      | string | No       | How the product/service solves the problem                                |
| `targetMarket`         | string | No       | Customer description                                                      |
| `revenueModel`         | string | No       | How money is made                                                         |
| `competitiveAdvantage` | string | No       | Key differentiators                                                       |
| `metadata`             | object | No       | Contains `goalIds`, `revenueCategories`, `monthlyRows`, `monthlyExpenses` |

### `marketanalyses` (1:1 with businessplan)

| Field                 | Type     | Required | Description                                                 |
| --------------------- | -------- | -------- | ----------------------------------------------------------- |
| `businessPlanId`      | string   | Yes      | Parent business plan ID                                     |
| `title`               | string   | Yes      | Analysis title                                              |
| `marketSize.tam`      | number   | No       | Total Addressable Market ($)                                |
| `marketSize.sam`      | number   | No       | Serviceable Addressable Market ($)                          |
| `marketSize.som`      | number   | No       | Serviceable Obtainable Market ($)                           |
| `marketSize.currency` | string   | No       | `USD`, `EUR`, `GBP`, `CAD`, `AUD`                           |
| `marketSize.year`     | number   | No       | Year for market size data                                   |
| `swot`                | object   | No       | `{ strengths[], weaknesses[], opportunities[], threats[] }` |
| `targetSegments`      | array    | No       | `[{ name, size, characteristics, painPoints[] }]`           |
| `trends`              | string[] | No       | Market trends                                               |

### `competitors` (Many:1 with businessplan)

| Field             | Type     | Required | Description               |
| ----------------- | -------- | -------- | ------------------------- |
| `businessPlanId`  | string   | Yes      | Parent business plan ID   |
| `name`            | string   | Yes      | Competitor name           |
| `description`     | string   | Yes      | Competitor overview       |
| `strengths`       | string[] | Yes      | Competitor strengths      |
| `weaknesses`      | string[] | Yes      | Competitor weaknesses     |
| `threatLevel`     | string   | Yes      | `low`, `medium`, `high`   |
| `website`         | string   | No       | Competitor URL            |
| `pricing`         | string   | No       | Pricing model description |
| `marketShare`     | string   | No       | Market share estimate     |
| `differentiators` | string[] | No       | Key differentiators       |

### `goals` (Many:many via metadata.goalIds)

| Field             | Type   | Required | Description                                                      |
| ----------------- | ------ | -------- | ---------------------------------------------------------------- |
| `title`           | string | Yes      | Goal name                                                        |
| `category`        | string | Yes      | `Revenue`, `Growth`, `Quality`, `Efficiency`, `Custom`           |
| `priority`        | number | No       | 1 (highest) to 5 (lowest)                                        |
| `status`          | string | No       | `Not Started`, `In Progress`, `At Risk`, `Complete`, `Cancelled` |
| `dueDate`         | string | No       | ISO date string                                                  |
| `currentProgress` | number | No       | 0-100                                                            |
| `metrics`         | array  | No       | `[{ id, name, type, targetValue, currentValue, unit }]`          |
| `targetValue`     | number | No       | Primary target value                                             |
| `unit`            | string | No       | e.g., `USD`, `%`, `users`                                        |
| `metricType`      | string | No       | `percentage`, `currency`, `count`, `custom`                      |

### `documents` (Loosely associated)

| Field          | Type   | Required | Description                      |
| -------------- | ------ | -------- | -------------------------------- |
| `title`        | string | Yes      | Document title                   |
| `content`      | string | Yes      | Markdown content                 |
| `documentType` | string | Yes      | `markdown`, `spec`, `plan`, etc. |

---

## Financial Data (Embedded in metadata)

Financial data lives in `businessplans.metadata`:

| Field               | Type   | Description                                     |
| ------------------- | ------ | ----------------------------------------------- |
| `goalIds`           | array  | Array of linked goal IDs                        |
| `revenueCategories` | array  | Category names: `["Subscriptions", "Services"]` |
| `monthlyRows`       | array  | `[{ month: "2026-03", categories: { ... } }]`   |
| `monthlyExpenses`   | number | Fixed monthly burn rate                         |

**Computed by app:** Row totals, category totals, grand total, break-even month.

---

## Enums

### Plan Type

| Value     | Description                 |
| --------- | --------------------------- |
| `startup` | New product/company         |
| `growth`  | Existing product scaling up |
| `pivot`   | Changing direction          |
| `annual`  | Annual strategic planning   |

### Plan Status

```
draft → active → archived
```

### Threat Level

| Value    | Description                                                 |
| -------- | ----------------------------------------------------------- |
| `high`   | Direct competitor, similar offering, strong market position |
| `medium` | Overlapping market, different approach or niche             |
| `low`    | Tangential competitor or potential future entrant           |

### Goal Category

`Revenue`, `Growth`, `Quality`, `Efficiency`, `Custom`

### Goal Status

```
Not Started → In Progress → [At Risk] → Complete
                                      → Cancelled
```

---

## MCP Tools

| Tool                        | Purpose                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| `bizplan-create`            | Create complete plan with market, competitors, goals, financials |
| `bizplan-get`               | Retrieve plan with all hydrated relations                        |
| `bizplan-list`              | List plans with optional status/type filter                      |
| `bizplan-update-financials` | Update revenue forecast and/or monthly expenses                  |
| `bizplan-add-competitor`    | Add a competitor to an existing plan                             |
| `bizplan-add-goal`          | Add a goal to an existing plan (safe merge)                      |
| `bizplan-generate-summary`  | Generate or regenerate executive summary document                |
| `bizplan-link-product`      | Connect plan to a product with shared goals                      |

**All tools require `orgId`.**

---

## Conventions

| Item                    | Convention                                                     |
| ----------------------- | -------------------------------------------------------------- |
| Business plan ID format | `bpln_XXXXXXXXXX`                                              |
| Market analysis ID      | `mkan_XXXXXXXXXX`                                              |
| Competitor ID           | `comp_XXXXXXXXXX`                                              |
| Goal ID                 | `goal_XXXXXXXXXX` (native collection)                          |
| Goal linking            | Via `metadata.goalIds[]` on the business plan (not a junction) |
| Financial data          | Embedded in `metadata`, not a separate collection              |
| Competitor count        | 3-5 minimum for useful competitive landscape                   |
| Goal count              | 3-5 across different categories                                |
| SWOT items              | 3-5 per quadrant                                               |

---

_Created: 2026-03-30_
