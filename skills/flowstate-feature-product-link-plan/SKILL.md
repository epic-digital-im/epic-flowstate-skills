---
name: flowstate-feature-product-link-plan
description: Use after product-link audit to propose product ownership for feature matrix items using source docs, product docs, codebase links, project ownership, and launch priorities. Produces a reviewable mapping plan only.
---

# FlowState Feature Product Link Plan

## Purpose

Create a proposed product mapping for feature matrix items.

This skill turns audit evidence into a reviewable plan. It does not write database records.

## Inputs

- Product-link audit output
- Feature matrix manifest or item docs
- Product list
- Product project links
- Source architecture docs
- Optional launch MVP docs

## Mapping Signals

Use these signals in order:

1. Existing direct product relation.
2. Existing product-owned project touching the feature.
3. Feature codebase links mapped to product-owned repositories/packages.
4. Product business plan or MVP docs mentioning the feature.
5. Launch MVP or gap priority docs.
6. Human-provided strategic ownership.

## Product Role Vocabulary

Use one of:

- `primary`: the product owns the user-facing outcome.
- `supporting`: the product depends on the feature but does not own it.
- `platform`: cross-cutting platform capability.
- `evidence`: product project touched the feature, but ownership is not yet canonical.

## Workflow

1. Load the audit result.
2. Group items by type:
   - features
   - services
   - gaps
3. Group products by product family:
   - Community
   - Cloud
   - Enterprise
   - Dojo
   - Marketplace
   - Directory
   - Observe
   - Admin/Auth/SAGA/Compliance modules
4. Generate proposed links.
5. Assign confidence:
   - `high`: direct project/product evidence and source docs agree.
   - `medium`: project evidence exists but ownership is shared.
   - `low`: only source-doc or strategic inference exists.
6. Produce an approval package.

## Output Shape

```json
{
  "proposedLinks": [
    {
      "productId": "prod_zIInzWoW4n",
      "productTitle": "FlowState Community Platform",
      "itemId": "rec__abc",
      "itemCollection": "records",
      "itemType": "feature",
      "itemSlug": "layer-4-agent-runtime-service",
      "role": "primary|supporting|platform|evidence",
      "confidence": "high|medium|low",
      "evidence": []
    }
  ],
  "manualReview": [],
  "approvalRequired": true
}
```

## Rules

- Do not create database links.
- Do not overwrite existing direct product links.
- Do not infer gap ownership from linked feature alone unless the gap has the same product impact.
- Mark shared platform capabilities as `platform` rather than forcing a single product owner.
- Keep low-confidence mappings out of the write manifest unless approved explicitly.
