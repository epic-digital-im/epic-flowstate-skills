---
name: flowstate-initiative-schema
description: Use when creating quarterly initiatives under a roadmap, linking projects to initiatives via projectIds[], or understanding initiative→project mapping in the bizplan→product→roadmap→initiative→project chain
---

# Initiative Schema

**Status:** Active
**Collection:** `initiatives`
**ID Prefix:** `init_` (legacy `rec__*` pending migration)
**Hierarchy Level:** Between roadmap and project
**Parent Required:** `roadmap` → `roadmapId`

---

## Overview

An **initiative** is a quarterly grouping of work under a roadmap. Initiatives contain projects via a `projectIds` array (an initiative can group N projects; a project typically belongs to one initiative but may span multiple for cross-quarter work).

```
Product
└── Roadmap
    └── Initiative  ← this document (N per quarter)
        └── Project  (via initiatives.projectIds[])
            └── Milestone
                └── Task
```

---

## Schema

### Required Fields

| Field       | Type   | Description                | Example             |
| ----------- | ------ | -------------------------- | ------------------- |
| `name`      | string | Initiative title           | `MVP Launch`        |
| `roadmapId` | string | Parent roadmap ID          | `road_9GEkaFr9qg`   |
| `quarter`   | string | Target quarter             | `Q2 2026`           |
| `status`    | string | Lifecycle status           | `Planned`           |
| `order`     | number | Sort order within quarter  | `0`                 |

### Optional Fields

| Field         | Type   | Description                                 |
| ------------- | ------ | ------------------------------------------- |
| `description` | string | What the initiative covers                  |
| `priority`    | string | `High`, `Medium`, `Low`                     |
| `color`       | string | UI color                                    |
| `projectIds`  | array  | Linked project IDs (`["proj_...", ...]`)    |
| `metadata`    | object | Custom metadata                             |

### Status Enum (observed in org data)

- `Planned` — scoped, not started
- `In Progress` — actively executing
- `Backlog` — deferred, not yet scheduled
- `Complete` — done

### Quarter Format

`Q<n> <YYYY>` (e.g. `Q2 2026`). Must fall within the parent roadmap's `startQuarter`–`endQuarter` range.

---

## Linking Rules

- `roadmapId` must reference an existing `roadmaps` record.
- Each entry in `projectIds[]` must reference an existing `projects` record.
- A project SHOULD appear in exactly one `In Progress` initiative at a time.
- When all projects in an initiative complete, mark the initiative `Complete`.

---

## Creating an Initiative

```
collection-create initiatives {
  name: "MVP Launch",
  roadmapId: "<roadmapId>",
  quarter: "Q2 2026",
  status: "Planned",
  priority: "High",
  order: 0,
  projectIds: [],
  title: "",
  archived: false,
  version: 1,
  orgId: "<orgId>",
  workspaceId: "<workspaceId>"
}
```

---

## Linking a Project to an Initiative

```
collection-update initiatives <initiativeId> {
  projectIds: [...existing, "<projectId>"]
}
```

---

## Dependency Chain

| Dependency | Check                                   | Create If Missing                           |
| ---------- | --------------------------------------- | ------------------------------------------- |
| Roadmap    | `collection-get roadmaps <roadmapId>`   | [roadmap-schema.md](../flowstate-roadmap-schema/SKILL.md) |

---

## Error Handling

| Situation                                    | Action                                                            |
| -------------------------------------------- | ----------------------------------------------------------------- |
| Project appears in multiple `In Progress` initiatives | Verify intentional; mark one primary in metadata          |
| Empty `projectIds[]`                         | Acceptable during planning; populate before initiative starts     |
| Initiative quarter outside roadmap range     | Extend roadmap `endQuarter` or move initiative                    |
| Initiative id is `rec__*` (legacy)           | Flag for migration via `flowstate-linking-audit`                  |

---

## Conventions

| Item                  | Convention                                    |
| --------------------- | --------------------------------------------- |
| Initiative ID format  | `init_XXXXX` (legacy `rec__*` being migrated) |
| Quarter format        | `Q<n> <YYYY>`                                 |
| Priority values       | `High`, `Medium`, `Low`                       |
| `order`               | Integer, 0-indexed within quarter             |
| Status transitions    | `Backlog` → `Planned` → `In Progress` → `Complete` |

---

_Created: 2026-04-18_
