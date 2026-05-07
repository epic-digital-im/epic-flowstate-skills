---
name: flowstate-feature-matrix-init
description: One-time migration skill that moves the feature matrix from records+VCA storage (schm_HZH76MFl9P features, schm_RQtuDMgEVK services, schm_kM85sh7P3e gap-items) into first-class features/gap-items/services collections, dedupes 8 duplicate gap slugs, removes VCA schema definitions, and establishes canonical storage for all future feature-matrix operations
---

# Feature Matrix Init (Canonicalization)

**Status:** One-shot migration
**Purpose:** Canonicalize feature-matrix storage on first-class `features`/`gap-items`/`services` collections. Remove legacy VCA (`records` with `schemaId: schm_*`) representations.
**Scope:** One-time; org-wide
**Trigger:** User approval of migration plan at `flowstate-platform/docs/plans/2026-04-18-feature-matrix-canonicalization.md`

---

## Overview

The feature matrix originally used the VCA/records pattern (3 schemas: `schm_HZH76MFl9P` features, `schm_RQtuDMgEVK` services, `schm_kM85sh7P3e` gap-items). First-class schema collections (`features`, `gap-items`, `services`) now exist and are canonical. This migration moves the data and decommissions the VCA path.

```
Backup -> Transform -> Dedup -> Write -> Verify -> Archive VCA -> Update skills
  (1)        (2)       (3)      (4)      (5)          (6)              (7)
```

Observed counts at plan time (2026-04-18):
- Features: 94 records in `records` with `schemaId: schm_HZH76MFl9P`
- Services: 49 records in `records` with `schemaId: schm_RQtuDMgEVK`
- Gap items: 94 records (8 duplicate slugs → 86 after dedup)

---

## Prerequisites

- **MANDATORY PRE-MIGRATION BACKUP** per production-safety policy (`docs/plans/2026-04-08-production-migration-safety.md`).
- Write access to `features`, `gap-items`, `services`, `records`, `schemas` collections.
- `flowstate-linking-audit` passes clean (products and bizplans canonical).
- User approval of the migration plan doc.

---

## Step 1: Backup

**Who:** Assigned agent
**Pause:** Yes (user verifies backup counts)

### Actions

1. Create backup directory:
   ```
   mkdir -p flowstate-platform/backups/2026-04-18-feature-matrix/
   ```
2. Dump each VCA source to JSON:
   ```
   collection-query records { "schemaId": "schm_HZH76MFl9P", "limit": 500 } → features.json
   collection-query records { "schemaId": "schm_RQtuDMgEVK", "limit": 500 } → services.json
   collection-query records { "schemaId": "schm_kM85sh7P3e", "limit": 500 } → gap-items.json
   ```
3. Verify row counts: features=94, services=49, gap-items=94.
4. Commit backup directory to the platform repo.

### Done when

- Backup files on disk
- Counts match
- User confirms

---

## Step 2: Transform

**Who:** Assigned agent
**Pause:** No

### Actions

For each record, lift `data.*` to top level and normalize.

**features** (94 records):
```jsonc
{
  slug:          record.data.slug,
  title:         record.data.name,
  description:   record.data.description || "",
  layer:         record.data.layer,
  tiers:         record.data.tiers,
  codebaseLinks: record.data.codebaseLinks || [],
  productId:     record.data.productId || "",
  bizplanId:     record.data.bizplanId || "",
  relatedServices: record.data.relatedServices || [],
  relatedGaps:  record.data.relatedGaps || [],
  orgId:        record.orgId,
  workspaceId:  record.workspaceId
}
```

**services** (49 records):
```jsonc
{
  slug:          record.data.slug,
  name:          record.data.name,   // services use `name` not `title`
  description:   record.data.description || "",
  type:          record.data.type,
  layer:         record.data.layer,
  owner:         record.data.owner || "",
  dependencies:  record.data.dependencies || [],
  codebaseLinks: record.data.codebaseLinks || [],
  linkedFeatures: [],
  orgId:         record.orgId,
  workspaceId:   record.workspaceId
}
```

**gap-items** (94 records, two shapes — normalize both):
```jsonc
{
  slug:          record.data.slug,
  title:         record.data.title || record.title || "",   // 14 Phase-D-audit rows stash title in data
  description:   record.data.description || "",
  priority:      record.data.priority,                      // string: "P0"/"P1"/"P2"
  status:        record.data.status || record.status || "open",  // 14 audit rows stash status in data
  targetQuarter: record.data.targetQuarter || null,
  linkedFeature: record.data.linkedFeature || "",
  linkedTaskId:  "",
  orgId:         record.orgId,
  workspaceId:   record.workspaceId
}
```

### Done when

- Three transformed arrays ready in memory

---

## Step 3: Dedup Gap Items

**Who:** Assigned agent
**Pause:** Yes (user confirms dedup plan)

### Actions

1. Identify the 8 known duplicate slugs (from 2026-04-18 feature-matrix audit):
   ```
   gap-layer-2-waf
   gap-layer-5-moderation-safety
   gap-layer-5-evaluation-test-harness
   gap-layer-7-external-api-connectors
   gap-layer-7-repository-connector
   gap-layer-7-business-system-connector
   gap-layer-7-tool-result-storage
   gap-layer-8-code-runner
   ```
2. For each duplicate slug:
   - Keep the P1 audit version (has `targetQuarter` set, created later)
   - Drop the P2 original
3. Expected final count: 94 − 8 = 86.
4. Display the dedup plan. User confirms.

### Done when

- 86 gap-items in the transformed array
- User confirms

---

## Step 4: Write to First-Class Collections

**Who:** Assigned agent
**Pause:** No

### Actions

Per `flowstate-schema-gotchas.md` parallel-batch fragility rule: validate ONE call first, then batch.

1. **Features** — issue 1 `collection-create features {...}` call alone. If it succeeds, batch the remaining 93.
2. **Services** — same pattern (1 + 48).
3. **Gap items** — same pattern (1 + 85).
4. Record a mapping `oldRecordId → newId` for each write.
5. Save mapping to `backups/2026-04-18-feature-matrix/id-map.json`.

### Done when

- All 229 rows (94 + 49 + 86) written
- Mapping persisted

---

## Step 5: Verify

**Who:** Assigned agent
**Pause:** Yes

### Actions

1. Count check:
   ```
   collection-query features   { orgId } → 94
   collection-query services   { orgId } → 49
   collection-query gap-items  { orgId } → 86
   ```
2. Sample check: pick 5 random records from each collection, compare top-level fields against backup.
3. Distribution check (features by `tiers.community`):
   - available ≈ 49
   - partial ≈ 31
   - not-implemented ≈ 13
   - archived/test ≈ 1
4. Distribution check (gap-items by priority): P0=3, P1=23, P2=60.
5. Display summary. User confirms.

### Done when

- Counts match
- Samples match backup
- User confirms

---

## Step 6: Archive VCA Records

**Who:** Assigned agent
**Pause:** Yes

### Actions

1. For each of the 237 original records (94+49+94), soft-delete:
   ```
   collection-update records <id> { archived: true }
   ```
2. Do NOT hard-delete. 30+ day retention satisfies the production-safety rollback window.

### Done when

- All 237 source records archived

---

## Step 7: Archive VCA Schemas

**Who:** Assigned agent
**Pause:** Yes

### Actions

1. Archive the three VCA schemas:
   ```
   collection-update schemas schm_HZH76MFl9P { archived: true }
   collection-update schemas schm_RQtuDMgEVK { archived: true }
   collection-update schemas schm_kM85sh7P3e { archived: true }
   ```
2. Do NOT delete. A follow-up sweep will confirm no code path references them.

### Done when

- Schemas archived

---

## Step 8: Update Dependent Skills

**Who:** Assigned agent
**Pause:** No

### Actions

1. Update `flowstate-feature-matrix-sync/SKILL.md`:
   - Replace `collection-query records { "schemaId": "schema:features" }` → `collection-query features { orgId }`
   - Replace `collection-update records <id> { tiers: ... }` → `collection-update features <id> { tiers: ... }`
   - Replace `collection-create records { schemaId: "schema:gap-items", ... }` → `collection-create gap-items { ... }`
2. Verify `flowstate-feature-declare/SKILL.md` already targets first-class (written simultaneously; should be clean).
3. File a follow-up task: "Rewrite Feature Matrix app (`flowstate-app-features`, `proj_wNkPz4SQWb`) data layer to use first-class collections instead of VCA/records."

### Done when

- Sync skill updated
- Follow-up task filed

---

## Rollback

If any step fails verification:

1. Delete the first-class rows created in Step 4 using the `id-map.json` mapping.
2. Un-archive the records in Step 6.
3. Un-archive the schemas in Step 7.
4. Restore from backup if any hard-delete happened (none by default).
5. Post-mortem on the discussion entity.

---

## Conventions

| Item                | Convention                                                       |
| ------------------- | ---------------------------------------------------------------- |
| Run frequency       | Once per org; idempotency via row-count check                    |
| Backup retention    | 30+ days per production-safety policy                            |
| Status vocabulary   | DB-actual `available/partial/not-implemented` (not spec's FULL/…) |
| Priority vocabulary | DB-actual `P0/P1/P2` strings (not the tasks-collection integer)  |
| Dedup policy        | Prefer newer + higher-priority variant                           |
| Soft-delete only    | Archived, not removed                                            |

---

## Cross-references

- `flowstate-feature-matrix-sync` — post-migration canonical maintainer
- `flowstate-feature-declare` — planning-time declaration
- `flowstate-linking-audit` — must pass BEFORE migration
- `docs/plans/2026-04-18-feature-matrix-canonicalization.md` — authoritative migration plan

---

_Created: 2026-04-18_
