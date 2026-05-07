---
name: flowstate-roadmap-schema
description: Use when creating a FlowState roadmap for a product, verifying every product has exactly one roadmap, or understanding the product→roadmap→initiative→project linking chain - roadmap is mandatory in the bizplan→product→roadmap→initiative→project→milestone→task spine
---

# Roadmap Schema

**Status:** Active
**Collection:** `roadmaps`
**ID Prefix:** `road_` (legacy `rec__*` pending migration)
**Hierarchy Level:** Between product and initiative
**Parent Required:** `product` → `productId`

---

## Overview

A **roadmap** belongs to exactly one product and holds quarter-by-quarter plans as child initiatives. Roadmap is **mandatory** in the full chain. Every product MUST have one roadmap record before any initiatives or projects can be linked under it.

```
BusinessPlan
└── Product
    └── Roadmap  ← this document (1 per product, mandatory)
        └── Initiative  (quarterly scopes)
            └── Project  (via initiatives.projectIds[])
                └── Milestone
                    └── Task
```

---

## Schema

### Required Fields

| Field       | Type   | Description        | Example            |
| ----------- | ------ | ------------------ | ------------------ |
| `productId` | string | Parent product ID  | `prod_zIInzWoW4n`  |

### Optional Fields

| Field          | Type   | Description                                         |
| -------------- | ------ | --------------------------------------------------- |
| `startQuarter` | string | Inclusive start, format `Q<n> <YYYY>` (`Q2 2026`)   |
| `endQuarter`   | string | Inclusive end, format `Q<n> <YYYY>` (`Q2 2027`)     |
| `metadata`     | object | Custom metadata                                     |

### API-required Beyond JSON Schema

`id`, `orgId`, `createdAt`, `updatedAt`, `title` (empty string OK), `archived`, `version`.

---

## Linking Rules

- **One roadmap per product.** If a product has two roadmap records, dedup to one (keep the `road_*` over `rec__*`, or the newer `_modified` if both are legacy).
- `productId` must reference an existing `products` row (not a `records`-collection shadow).
- Workspace is inherited from the product's workspace.

---

## Creating a Roadmap

```
collection-create roadmaps {
  productId: "<productId>",
  startQuarter: "Q2 2026",
  endQuarter: "Q2 2027",
  title: "",
  archived: false,
  version: 1,
  orgId: "<orgId>",
  workspaceId: "<workspaceId>"
}
```

---

## Dependency Chain

| Dependency | Check                                 | Create If Missing                       |
| ---------- | ------------------------------------- | --------------------------------------- |
| Product    | `collection-get products <productId>` | [product-schema.md](../flowstate-product-schema/SKILL.md) |

---

## Error Handling

| Situation                     | Action                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| Product has 2+ roadmaps       | Keep the one with latest `_modified`; archive the others          |
| Roadmap id is `rec__*` (legacy) | Plan migration to `road_*` prefix; flag via `flowstate-linking-audit` |
| Product without a roadmap     | Create one before linking any initiatives/projects                |
| `productId` does not resolve  | Stop; create the product first via `flowstate-product-schema`     |

---

## Conventions

| Item              | Convention                               |
| ----------------- | ---------------------------------------- |
| Roadmap ID format | `road_XXXXX`                             |
| One per product   | Always                                   |
| Quarter format    | `Q<n> <YYYY>` (e.g. `Q2 2026`)           |
| Title             | Empty string; `productId` is the identity |
| Status field      | None — status lives on child initiatives  |

---

_Created: 2026-04-18_
