---
name: flowstate-product-schema
description: Use when creating FlowState products, linking goals/team/projects to products, querying product data, or understanding product lifecycle phases and team roles - provides product collection schema, related junction collections, MCP tools, and field reference.
---

# Product Schema

**Status:** Active
**Collection:** `products` (via VCA — records collection)
**ID Prefix:** `rec__` (VCA record)
**Hierarchy Level:** Cross-cutting (linked to org, workspace, bizplan, projects, goals, team)

---

## Overview

A **product** is FlowState's unit of product management. Products aggregate goals, team members, projects, and a roadmap with initiatives. Products can be linked to business plans for strategic alignment and to projects for execution tracking.

```
Org
└── Workspace
    └── Product  ← this document
        ├── Goals (via productgoals junction)
        ├── Team Members (via productteammembers junction)
        ├── Projects (via productprojects junction)
        └── Roadmap
            └── Initiatives
```

---

## Collections

### `products` (Core Record)

| Field                  | Type     | Required | Description                                            |
| ---------------------- | -------- | -------- | ------------------------------------------------------ |
| `name`                 | string   | Yes      | Slug-style identifier: `flowstate-desktop`             |
| `title`                | string   | Yes      | Display name: `FlowState Desktop`                      |
| `description`          | string   | Yes      | Product description                                    |
| `type`                 | string   | Yes      | `software`, `physical`, `service`, `content`, `custom` |
| `currentPhase`         | string   | Yes      | Lifecycle phase (see below)                            |
| `orgId`                | string   | Yes      | Parent organization ID                                 |
| `workspaceId`          | string   | No       | Parent workspace ID (recommended)                      |
| `problemStatement`     | string   | No       | What problem does this solve                           |
| `valueProposition`     | string   | No       | Why choose this product                                |
| `targetMarket`         | string[] | No       | Market segments                                        |
| `customerPersona`      | string   | No       | Target user description                                |
| `competitiveLandscape` | string   | No       | Competitive positioning                                |
| `kpis`                 | array    | No       | Key performance indicators                             |
| `metadata`             | object   | No       | Custom metadata                                        |

### `productgoals` (Junction)

| Field       | Type    | Required | Description                    |
| ----------- | ------- | -------- | ------------------------------ |
| `productId` | string  | Yes      | Parent product ID              |
| `goalId`    | string  | Yes      | Linked goal ID                 |
| `isPrimary` | boolean | No       | Whether this is a primary goal |

### `productteammembers` (Junction)

| Field          | Type    | Required | Description                                                 |
| -------------- | ------- | -------- | ----------------------------------------------------------- |
| `productId`    | string  | Yes      | Parent product ID                                           |
| `teamMemberId` | string  | No       | Linked team member ID                                       |
| `userName`     | string  | No       | Display name (if creating new)                              |
| `userEmail`    | string  | No       | Email (if creating new)                                     |
| `role`         | string  | Yes      | Org-level role: `owner`, `manager`, `contributor`, `viewer` |
| `productRole`  | string  | Yes      | Product role: `lead`, `member`, `advisor`, `observer`       |
| `isPrimary`    | boolean | No       | Primary team member flag                                    |
| `isAgent`      | boolean | No       | Whether this is an AI agent                                 |
| `linkedBy`     | string  | Auto     | User ID who created the link                                |

### `productprojects` (Junction)

| Field       | Type   | Required | Description                        |
| ----------- | ------ | -------- | ---------------------------------- |
| `productId` | string | Yes      | Parent product ID                  |
| `projectId` | string | No       | Linked project ID                  |
| `title`     | string | Yes      | Project title                      |
| `role`      | string | No       | `primary`, `supporting`, `related` |
| `linkedBy`  | string | Auto     | User ID who created the link       |

### `roadmaps`

| Field       | Type   | Required | Description       |
| ----------- | ------ | -------- | ----------------- |
| `productId` | string | Yes      | Parent product ID |
| `title`     | string | Yes      | Roadmap title     |
| `timeframe` | string | No       | e.g., `2026`      |

### `initiatives`

| Field       | Type   | Required | Description                                 |
| ----------- | ------ | -------- | ------------------------------------------- |
| `roadmapId` | string | Yes      | Parent roadmap ID                           |
| `name`      | string | Yes      | Initiative slug                             |
| `quarter`   | string | Yes      | e.g., `Q2 2026`                             |
| `status`    | string | Yes      | `Backlog`, `Planned`, `In Progress`, `Done` |
| `priority`  | string | Yes      | `High`, `Medium`, `Low`                     |
| `color`     | string | No       | Display color                               |
| `order`     | number | No       | Sort order                                  |

### `goals`

| Field         | Type   | Required | Description                                            |
| ------------- | ------ | -------- | ------------------------------------------------------ |
| `title`       | string | Yes      | Goal name                                              |
| `category`    | string | Yes      | `Revenue`, `Growth`, `Quality`, `Efficiency`, `Custom` |
| `targetValue` | number | No       | Numeric target                                         |
| `unit`        | string | No       | e.g., `%`, `users`, `USD`                              |
| `metricType`  | string | No       | `percentage`, `currency`, `count`, `custom`            |

---

## Product Types

| Type     | Enum Value | Description                          |
| -------- | ---------- | ------------------------------------ |
| Software | `software` | Desktop, web, or mobile applications |
| Physical | `physical` | Hardware or tangible products        |
| Service  | `service`  | Professional or managed services     |
| Content  | `content`  | Publications, courses, media         |
| Custom   | `custom`   | Other product types                  |

---

## Product Phases (Lifecycle)

```
concept -> discovery -> design -> development -> beta -> launch -> growth -> sunset
```

Advance phases via `product-advance-phase` tool.

---

## Product Team Roles

| Role       | Description                        |
| ---------- | ---------------------------------- |
| `lead`     | Product owner/primary stakeholder  |
| `member`   | Active contributor                 |
| `advisor`  | Strategic guidance, not day-to-day |
| `observer` | Informed but not contributing      |

---

## Product-Project Roles

| Role         | Description                   |
| ------------ | ----------------------------- |
| `primary`    | Main project for this product |
| `supporting` | Contributes to the product    |
| `related`    | Loosely connected             |

---

## MCP Tools

| Tool                      | Purpose                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| `product-create`          | Create product with goals, team, roadmap, initiatives in one call |
| `product-get`             | Retrieve product with all hydrated relations                      |
| `product-list`            | List products with summary counts                                 |
| `product-add-goal`        | Add goal and link to product                                      |
| `product-add-team-member` | Add team member to product                                        |
| `product-add-project`     | Add project to product                                            |
| `product-add-initiative`  | Add initiative to product roadmap                                 |
| `product-advance-phase`   | Move product to next lifecycle phase                              |
| `bizplan-link-product`    | Connect product to business plan with shared goals                |

---

## Conventions

| Item               | Convention                                              |
| ------------------ | ------------------------------------------------------- |
| Product ID format  | `rec__XXXXXXXXXX` (VCA record ID)                       |
| Product name       | Slug-style: `flowstate-desktop`, `flowstate-mobile`     |
| Junction IDs       | All `rec__` prefix (VCA records)                        |
| Goal IDs           | `goal_XXXXXXXXXX` (native collection)                   |
| Batch size         | 7 parallel operations for team member creation          |
| Team member source | `teammembers` collection, org chart for role derivation |

---

_Created: 2026-03-30_
