---
name: flowstate-feature-matrix-load
description: Use whenever a FlowState workflow needs the complete feature, service, and gap matrix. Loads first-class collections first, falls back to legacy VCA record schemas, and normalizes all rows into one audit-ready shape.
---

# FlowState Feature Matrix Load

## Purpose

Load the complete feature matrix from FlowState and return a normalized inventory for downstream audit, planning, declaration, and sync workflows.

Use this skill before any workflow that loops over features, services, or gap items.

## Inputs

- `orgId`
- `workspaceId`
- Optional legacy VCA workspace id
- Optional schema ids:
  - Feature VCA schema: `schm_HZH76MFl9P`
  - Service VCA schema: `schm_RQtuDMgEVK`
  - Gap VCA schema: `schm_kM85sh7P3e`

## Workflow

1. Verify the active FlowState config.
   - Read `.flowstate/config.json` when available.
   - Confirm `orgId`, `workspaceId`, and `codebaseId`.

2. Query first-class collections.
   - Query `features` for the active org/workspace.
   - Query `services` for the active org/workspace.
   - Query `gap-items` for the active org/workspace.

3. Decide source mode.
   - If first-class collections contain feature rows, use first-class mode.
   - If first-class feature count is zero, use VCA fallback mode.
   - VCA fallback is read-only.

4. In VCA fallback mode, query `records`.
   - Features: `schemaId = schm_HZH76MFl9P`
   - Services: `schemaId = schm_RQtuDMgEVK`
   - Gap items: `schemaId = schm_kM85sh7P3e`
   - Include active records only unless the audit explicitly asks to inspect archived records.

5. Normalize every row.
   - Preserve source collection and source id.
   - Preserve original tier status fields.
   - Preserve `codebaseLinks`, `serviceIds`, `gapIds`, relation metadata, and archived flags when present.

6. Return the matrix inventory.

## Normalized Feature Shape

```json
{
  "id": "feature or record id",
  "sourceCollection": "features|records",
  "sourceSchemaId": "schm_HZH76MFl9P",
  "slug": "layer-4-prompt-assembly-service",
  "title": "Prompt Assembly Service",
  "description": "",
  "layer": "agent",
  "tiers": {
    "community": "available|partial|not-implemented",
    "basic": "available|partial|not-implemented",
    "pro": "available|partial|not-implemented",
    "enterprise": "available|partial|not-implemented"
  },
  "codebaseLinks": [],
  "relatedServices": [],
  "relatedGaps": [],
  "archived": false
}
```

## Rules

- Do not write to legacy VCA records from audit workflows.
- Do not infer availability from docs alone.
- Keep original ids in the normalized payload for traceability.
- Report the source mode clearly: `first-class`, `vca-fallback`, or `mixed`.
- If first-class and VCA records both exist, prefer first-class and report VCA count as legacy context.

## Output

Return a concise summary plus a structured payload:

```json
{
  "sourceMode": "first-class|vca-fallback|mixed",
  "counts": {
    "features": 0,
    "services": 0,
    "gapItems": 0
  },
  "features": [],
  "services": [],
  "gapItems": []
}
```
