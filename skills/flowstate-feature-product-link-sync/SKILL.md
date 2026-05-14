---
name: flowstate-feature-product-link-sync
description: Use after a reviewed feature-product mapping plan is approved. Creates or updates FlowState relations between products and feature matrix items, writes provenance metadata, and verifies coverage.
---

# FlowState Feature Product Link Sync

## Purpose

Apply approved product links for feature matrix items.

This skill is write-capable, but only after explicit human approval of a mapping plan.

## Supported Link Shape

Prefer `relations` records:

```json
{
  "sourceId": "prod_zIInzWoW4n",
  "sourceCollection": "products",
  "targetId": "rec__abc",
  "targetCollection": "features|services|gap-items|records",
  "relationType": "product-feature",
  "metadata": {
    "role": "primary|supporting|platform|evidence",
    "itemType": "feature|service|gap",
    "itemSlug": "layer-4-agent-runtime-service",
    "confidence": "high|medium|low",
    "evidence": []
  }
}
```

For legacy VCA records, use `targetCollection: "records"` unless the local system already resolves feature records through `features`.

## Workflow

1. Load the approved mapping plan.
2. Validate every product id exists.
3. Validate every feature matrix item id exists.
4. Check for existing product-feature relations.
5. Create missing relations.
6. Update stale relation metadata when approved.
7. Optionally write product-link metadata onto local tracking docs.
8. Re-run `flowstate-feature-product-link-audit`.
9. Report before/after coverage.

## Approval Gate

Before writing, show:

- Number of links to create.
- Number of links to update.
- Links grouped by product.
- All low-confidence links.
- Any links involving archived records.

Proceed only after explicit approval.

## Rules

- Do not mutate feature tiers or gap statuses.
- Do not delete existing links unless the user explicitly asks.
- Do not create duplicate relations for the same product/item/role.
- Preserve evidence and confidence in relation metadata.
- Use direct product-feature relations as canonical; project-derived links remain inferred evidence.
