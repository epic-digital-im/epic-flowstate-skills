---
name: flowstate-entity-assignment
description: Use when assigning team members to any FlowState entity (task, project, milestone, goal, initiative, product, businessplan, document, etc.) with roles and RACI - wraps entityassignments collection and entity-assign MCP tools with agent identity enforcement
---

# Entity Assignment

**Status:** Active
**Purpose:** Assign team members to any FlowState entity using the universal `entityassignments` collection and MCP assignment tools
**Scope:** All entity types that support team member assignment
**Trigger:** When any entity needs team member ownership, contribution, review, or observation roles
**Input:** Entity type + ID, team member IDs, roles
**Output:** `entityassignments` records linking team members to entities

---

## Overview

FlowState has two assignment mechanisms:

1. **Specialized junction tables** for products and business plans:
   - `productteammembers` (via `product-add-team-member` MCP tool)
   - `businessplanteammembers` (via `bizplan-add-team-member` MCP tool)

2. **Universal entity assignments** for everything else:
   - `entityassignments` collection (via `entity-assign`, `entity-assignments-bulk` MCP tools)
   - Supports: task, project, milestone, goal, initiative, product, businessplan, roadmap, document, proposal, mission, deal, campaign, codebase

This skill covers the **universal** mechanism. For product/bizplan-specific linking with RACI, use `flowstate-product-link-teammembers` or `flowstate-bizplan-link-teammembers`.

---

## Prerequisites

Before starting:

- Entity exists in FlowState (you have the entity ID and type)
- Team members exist in `teammembers` collection
- `orgId` and `workspaceId` from `.flowstate/config.json`
- Agent identity loaded (see `flowstate-agent-identity`)

---

## Supported Entity Types

| Entity Type    | Example Use Case                                    |
| -------------- | --------------------------------------------------- |
| `task`         | Assign owner, contributors, reviewers to a task     |
| `project`      | Set project lead, team members                      |
| `milestone`    | Assign milestone owner, observers                   |
| `goal`         | Link responsible team members to goals              |
| `initiative`   | Assign initiative drivers                           |
| `product`      | Additional assignments beyond productteammembers    |
| `businessplan` | Additional assignments beyond bizplanteammembers    |
| `roadmap`      | Assign roadmap maintainers                          |
| `document`     | Assign document owners and reviewers                |
| `proposal`     | Link proposal authors and reviewers                 |
| `mission`      | Assign mission executors                            |
| `deal`         | Link deal owners and support team                   |
| `campaign`     | Assign campaign managers and contributors           |
| `codebase`     | Assign codebase maintainers                         |

## Supported Roles

| Role          | Meaning                                          |
| ------------- | ------------------------------------------------ |
| `owner`       | Primary responsible person. Also sets `assigneeId` on the target entity. |
| `contributor` | Active participant in the work                   |
| `reviewer`    | Reviews deliverables before completion           |
| `observer`    | Informed of progress, no active role             |

---

## Step 0: Resolve Team Member IDs

**Who:** Assigned agent
**Pause:** No

### Actions

1. Identify which team members need assignment. Sources:
   - Agent definitions in `.flowstate/agents/{name}.json` -> `metadata.teamMemberId`
   - `teammembers` collection query: `collection-query teammembers { "orgId": "<orgId>" }`
   - Specific team member by name: `collection-query teammembers { "orgId": "<orgId>", "userName": "<name>" }`

2. For agent-driven work, the executing agent's `teamMemberId` is the primary assignment:
   ```
   Read .flowstate/agents/<agent-name>.json -> metadata.teamMemberId
   ```

3. Check for existing assignments to avoid duplicates:
   ```
   entity-assignments-list {
     orgId: "<orgId>",
     entityType: "<type>",
     entityId: "<id>"
   }
   ```

### Done when

- Team member IDs resolved from agent definitions or teammembers collection
- Existing assignments checked

---

## Step 1: Assign Single Team Member

**Who:** Assigned agent
**Pause:** No

Use for assigning one team member at a time.

### Actions

```
entity-assign {
  entityType: "<task|project|milestone|...>",
  entityId: "<entity_id>",
  teamMemberId: "<team_member_id>",
  role: "<owner|contributor|reviewer|observer>",
  orgId: "<orgId>",
  workspaceId: "<workspaceId>"
}
```

**Owner role side effect:** If `role` is `"owner"`, the MCP tool also sets `assigneeId` on the target entity. Only one owner per entity.

### Done when

- Assignment record created
- If owner: target entity's `assigneeId` updated

---

## Step 2: Bulk Assign Team Members

**Who:** Assigned agent
**Pause:** No

Use when assigning multiple team members to the same entity.

### Actions

```
entity-assignments-bulk {
  entityType: "<task|project|milestone|...>",
  entityId: "<entity_id>",
  assignments: [
    { "teamMemberId": "<id1>", "role": "owner" },
    { "teamMemberId": "<id2>", "role": "contributor" },
    { "teamMemberId": "<id3>", "role": "reviewer" },
    { "teamMemberId": "<id4>", "role": "observer" }
  ],
  orgId: "<orgId>",
  workspaceId: "<workspaceId>"
}
```

### Done when

- All assignment records created
- Owner's `assigneeId` set on target entity

---

## Step 3: Remove Assignment

**Who:** Assigned agent
**Pause:** No

### Actions

1. Find the assignment ID:
   ```
   entity-assignments-list {
     orgId: "<orgId>",
     entityType: "<type>",
     entityId: "<id>",
     teamMemberId: "<member_to_remove>"
   }
   ```

2. Remove the assignment:
   ```
   entity-unassign {
     assignmentId: "<assignment_id>",
     orgId: "<orgId>"
   }
   ```

**Owner removal side effect:** If the removed assignment had role `"owner"`, the MCP tool clears `assigneeId` on the target entity.

### Done when

- Assignment record removed
- If owner: target entity's `assigneeId` cleared

---

## Common Patterns

### Task Ownership (during task execution)

When claiming a task in Step 0 of task execution:

```
entity-assign {
  entityType: "task",
  entityId: "<task_id>",
  teamMemberId: "<executing_agent_teamMemberId>",
  role: "owner",
  orgId: "<orgId>",
  workspaceId: "<workspaceId>"
}
```

### Code Review Assignment

When dispatching a code reviewer:

```
entity-assign {
  entityType: "task",
  entityId: "<task_id>",
  teamMemberId: "<reviewer_agent_teamMemberId>",
  role: "reviewer",
  orgId: "<orgId>",
  workspaceId: "<workspaceId>"
}
```

### Project Team Setup

When a project is created, assign the full team:

```
entity-assignments-bulk {
  entityType: "project",
  entityId: "<project_id>",
  assignments: [
    { "teamMemberId": "<lead_teamMemberId>", "role": "owner" },
    { "teamMemberId": "<eng_teamMemberId>", "role": "contributor" },
    { "teamMemberId": "<reviewer_teamMemberId>", "role": "reviewer" }
  ],
  orgId: "<orgId>",
  workspaceId: "<workspaceId>"
}
```

### Query All Assignments for a Team Member

Find everything a team member is assigned to:

```
entity-assignments-list {
  orgId: "<orgId>",
  teamMemberId: "<team_member_id>"
}
```

---

## Identity Enforcement

All assignments use `teamMemberId` values that come from:

1. **Agent definitions:** `.flowstate/agents/{name}.json` -> `metadata.teamMemberId`
2. **Team member queries:** `collection-query teammembers { ... }` -> `id` field
3. **User records:** `rbac-user-me` or `rbac-user-list` -> mapped to team members

Never fabricate team member IDs. If you don't know the team member ID, query the `teammembers` collection or read the agent definition file.

The `assignedBy` field on `entityassignments` is automatically set by the MCP tool based on the authenticated session. You do not need to set it manually.

---

## Idempotency

| Scenario                              | Behavior                                        |
| ------------------------------------- | ----------------------------------------------- |
| Same teamMemberId + role pair         | Returns existing assignment (idempotent)         |
| Same teamMemberId, different role     | Creates new assignment (one member can have multiple roles) |
| Entity doesn't exist                  | Error from MCP tool                             |
| Team member doesn't exist             | Error from MCP tool                             |

---

## Error Handling

| Situation                    | Action                                              |
| ---------------------------- | --------------------------------------------------- |
| Team member not found        | Query `teammembers` collection, verify ID exists    |
| Entity not found             | Verify entity ID and type are correct               |
| Duplicate assignment         | Idempotent, returns existing record                 |
| Missing orgId/workspaceId    | Read from `.flowstate/config.json`                  |
| Assignment removal fails     | Verify assignment ID exists via list first          |

---

## Conventions

| Item                    | Convention                                                |
| ----------------------- | --------------------------------------------------------- |
| One owner per entity    | Only one `owner` role assignment per entity               |
| Agent identity required | Always resolve teamMemberId from agent JSON, never guess  |
| Bulk over individual    | Use `entity-assignments-bulk` when assigning 2+ members   |
| Check before assign     | Query existing assignments to avoid confusion             |
| Specialized vs generic  | Use product/bizplan MCP tools for those; this for all else |

---

_Created: 2026-03-30_
