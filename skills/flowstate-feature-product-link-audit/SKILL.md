---
name: flowstate-feature-product-link-audit
description: Use when checking whether feature matrix items are linked to FlowState products. Audits direct relations, embedded product fields, product-project inheritance, and coverage gaps without mutating records.
---

# FlowState Feature Product Link Audit

## Purpose

Audit feature matrix items for product linkage.

This skill answers:

- Which features, services, and gaps have direct product links?
- Which items are indirectly linked through product-owned projects?
- Which items have no product context?
- Which product links are stale, ambiguous, or only inferred?

## Inputs

- `orgId`
- `workspaceId`
- Feature matrix source:
  - first-class `features`, `services`, `gap-items`, or
  - legacy VCA `records` schemas
- Product collections:
  - `products`
  - `productprojects`
  - `projects`
  - `relations`

## Workflow

1. Load feature matrix items.
   - Prefer `flowstate-feature-matrix-load`.
   - Include feature, service, and gap records.
   - Preserve source ids and source collection names.

2. Load products.
   - Query `products`.
   - Build `productId -> product title/name` lookup.

3. Check embedded product references.
   - Inspect `productId`, `productIds`, `products`, and `metadata.product*`.
   - Inspect `data`, `metadata`, and `extended`.

4. Check direct relations.
   - Query `relations`.
   - Look for feature matrix item to product links in either direction.
   - Recognize `features`, `services`, `gap-items`, and legacy `records` targets.

5. Check indirect project inheritance.
   - Query `relations` for `projects -> features/services/gap-items/records`.
   - Query `projects.productId`.
   - Query `productprojects`.
   - Infer product coverage only when a linked project has a product owner.

6. Summarize coverage.
   - Direct product links.
   - Indirect product links through projects.
   - Unlinked matrix items.
   - Product coverage by matrix type.

## Output Shape

```json
{
  "counts": {
    "features": 94,
    "services": 49,
    "gaps": 86,
    "directProductLinks": 0,
    "indirectProductLinks": 46,
    "embeddedProductRefs": 0,
    "unlinked": 183
  },
  "directLinks": [],
  "indirectLinks": [],
  "unlinked": [],
  "recommendations": []
}
```

## Rules

- Do not mutate records.
- Treat project-derived product links as inferred, not canonical.
- Report direct and indirect coverage separately.
- Include product ids and product titles in the output.
- Flag services and gaps separately; they often need different ownership than layer features.
