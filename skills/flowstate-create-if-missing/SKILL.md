---
name: flowstate-create-if-missing
description: Use when a FlowState entity (workspace, codebase, project, milestone) referenced in a config file may have been deleted - checks if the ID from config exists in DB, creates the record with the SAME ID if missing, then updates config. Preserves all existing child entity references.
---

# Create-If-Missing Pattern

**Purpose:** Recover from deleted FlowState records without breaking child entities.
**Used by:** flowstate-project-schema, flowstate-milestone-schema, flowstate-object-hierarchy, flowstate-config-validation

---

## Core Principle

When a `.flowstate/config.json` has an ID but the record is gone from FlowState:

1. **Create with the same ID** — this preserves all milestones, tasks, and documents that reference it
2. **Never generate a new ID** when an existing one is in the config
3. **Commit the config** only if you had to ADD a new ID (existing IDs already there stay)

```
config has ID? → collection-get → found? use it
                              → 404?  create with same ID
                                      commit config

config missing ID? → query by name → found? write ID to config
                                  → not found? create new, write ID to config
                                               commit config
```

---

## Per-Entity Patterns

### Workspace

```
workspaceId in config:
  collection-get workspaces <workspaceId>
  → 404: collection-create workspaces { id: <workspaceId>, name, title, orgId, ... }
         (workspace re-creation is rare; consider running workspace-registration)

workspaceId missing:
  → run flowstate-workspace-registration
```

### Codebase

```
codebaseId in root config:
  collection-get codebases <codebaseId>
  → 404: collection-create codebases { id: <codebaseId>, name, repository{...}, environment{...}, orgId, workspaceId }
         propagate codebaseId to all package configs

codebaseId missing:
  → run flowstate-codebase-registration
```

### Project (most common case)

```
projectId in package config:
  collection-get projects <projectId>
  → found: proceed
  → 404: collection-create projects {
           id: "<projectId>",         ← MUST use existing ID
           name: "<kebab-name>",
           title: "<Package Title>",
           orgId, workspaceId, codebaseId,
           completed: false, archived: false, version: 1
         }
         (no config update needed — ID was already there)

projectId missing from config:
  collection-query projects { workspaceId, name: "<package-name>" }
  → found: write projectId to package config, commit
  → not found: collection-create projects { name, title, orgId, workspaceId, ... }
               write new projectId to package config, commit
```

### Milestone

```
milestoneId known:
  collection-get milestones <milestoneId>
  → 404: collection-create milestones {
           id: "<milestoneId>",        ← use existing if known
           projectId, orgId, workspaceId,
           title, goalId: "", status: "To Do",
           completed: false, archived: false, version: 1
         }

milestoneId unknown:
  collection-query milestones { projectId, name: "<group>" }
  → found: use its milestoneId
  → not found: create new milestone, record milestoneId
```

---

## Why Same ID Matters

Child entities store parent IDs directly:

```
task_abc: { projectId: "proj_OLD", milestoneId: "mile_OLD" }
```

If you create `proj_NEW` for the same package, `task_abc` becomes orphaned — its `projectId` no longer matches any real project. Using `proj_OLD` (the original ID) means the task is immediately reconnected with zero updates.

---

## Quick Checklist

- [ ] Check config for existing ID before querying by name
- [ ] If ID in config → use that ID in `collection-create`
- [ ] If no ID in config → query by name first, create only if not found
- [ ] Commit config only when you added a NEW ID (not when ID was already there)
- [ ] Verify child entities still point to correct parent after recreation

---

_Sub-skill of: flowstate-project-schema, flowstate-object-hierarchy_
_Created: 2026-03-29_
