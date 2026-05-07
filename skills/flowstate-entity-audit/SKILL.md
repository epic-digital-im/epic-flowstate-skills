---
name: flowstate-entity-audit
description: Use when auditing FlowState entities for proper team member linking, userId attribution, RACI assignments, and entityassignment coverage across products, business plans, projects, milestones, and tasks - investigates and corrects missing or incorrect identity data
---

# Entity Audit

**Status:** Active
**Purpose:** Audit all FlowState entities for proper team member linking, userId attribution, and assignment coverage. Investigate and correct issues found.
**Scope:** Products, business plans, projects, milestones, tasks, documents, discussions, approvals
**Trigger:** Periodic audit, after bulk entity creation, or when identity issues are suspected
**Input:** orgId (from `.flowstate/config.json`)
**Output:** Audit report with issues found and corrections applied

---

## Overview

FlowState entities require proper identity attribution and team member linking. This audit verifies:

1. **userId attribution** on ALL entities (discussions, documents, tasks, approvals, etc.)
2. **Product team linking** via `productteammembers` junction table
3. **Business plan team linking** via `businessplanteammembers` junction table with RACI
4. **Universal assignments** via `entityassignments` for projects, milestones, tasks, goals
5. **Owner assignments** on tasks and milestones (assigneeId set)
6. **Cross-entity consistency** between product, bizplan, and project teams

When issues are found, this skill does not silently skip them. It investigates to determine the correct team member and corrects the record.

---

## Prerequisites

Before starting:

- `orgId` and `workspaceId` from `.flowstate/config.json`
- Agent identity loaded (coordinator for primary session)
- Access to `.flowstate/agents/` directory for teamMemberId resolution

---

## Step 0: Load Context

**Who:** Assigned agent
**Pause:** No

### Actions

1. Read `.flowstate/config.json` to get `orgId`, `workspaceId`
2. Read `.flowstate/agents/coordinator.json` to get primary session identity
3. Load all team members:
   ```
   collection-query teammembers { "orgId": "<orgId>" }
   ```
4. Load all agent definitions from `.flowstate/agents/*.json` to build a lookup:
   ```
   agentName -> { teamMemberId, characterName, orgRole }
   ```
5. Initialize audit report:
   ```
   auditReport = {
     productsChecked: 0,
     bizplansChecked: 0,
     projectsChecked: 0,
     milestonesChecked: 0,
     tasksChecked: 0,
     documentsChecked: 0,
     discussionsChecked: 0,
     approvalsChecked: 0,
     issuesFound: [],
     issuesCorrected: []
   }
   ```

### Done when

- Config loaded, team members queried, agent lookup built
- Audit report initialized

---

## Step 1: Audit Products

**Who:** Assigned agent
**Pause:** No

### Actions

1. List all products for the org:
   ```
   product-list { orgId: "<orgId>" }
   ```

2. For each product, check for `productteammembers`:
   ```
   collection-query productteammembers { "productId": "<product_id>", "orgId": "<orgId>" }
   ```

3. **Check criteria:**

   | Check | Pass Condition | Issue Type |
   |-------|---------------|------------|
   | Has team members | At least 1 `productteammembers` record | `product-no-team` |
   | Has a lead | At least 1 member with `productRole: "lead"` | `product-no-lead` |
   | Members exist | Each `teamMemberId` exists in `teammembers` collection | `product-orphan-member` |

4. For each issue found:
   - Log to `auditReport.issuesFound`
   - Attempt resolution (see Resolution Strategies below)

### Done when

- All products checked for team member linking
- Issues logged and resolution attempted

---

## Step 2: Audit Business Plans

**Who:** Assigned agent
**Pause:** No

### Actions

1. List all business plans:
   ```
   bizplan-list { orgId: "<orgId>" }
   ```

2. For each bizplan, check for `businessplanteammembers`:
   ```
   collection-query businessplanteammembers { "businessPlanId": "<bizplan_id>", "orgId": "<orgId>" }
   ```

3. **Check criteria:**

   | Check | Pass Condition | Issue Type |
   |-------|---------------|------------|
   | Has team members | At least 1 `businessplanteammembers` record | `bizplan-no-team` |
   | Has a lead | At least 1 member with `planRole: "lead"` | `bizplan-no-lead` |
   | Has RACI | At least 1 member has non-empty `raciAssignments` | `bizplan-no-raci` |
   | Members exist | Each `teamMemberId` exists in `teammembers` | `bizplan-orphan-member` |

4. For each issue, log and attempt resolution.

### Done when

- All business plans checked for team member linking and RACI
- Issues logged and resolution attempted

---

## Step 3: Audit Projects

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query all projects:
   ```
   collection-query projects { "orgId": "<orgId>" }
   ```

2. For each project, check for `entityassignments`:
   ```
   entity-assignments-list { orgId: "<orgId>", entityType: "project", entityId: "<project_id>" }
   ```

3. **Check criteria:**

   | Check | Pass Condition | Issue Type |
   |-------|---------------|------------|
   | Has assignments | At least 1 `entityassignment` record | `project-no-assignments` |
   | Has owner | At least 1 assignment with `role: "owner"` | `project-no-owner` |
   | Assignments valid | Each `teamMemberId` exists in `teammembers` | `project-orphan-assignment` |

4. For each issue, log and attempt resolution.

### Done when

- All projects checked for entity assignments
- Issues logged and resolution attempted

---

## Step 4: Audit Milestones

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query all milestones (can scope by project if preferred):
   ```
   collection-query milestones { "orgId": "<orgId>" }
   ```

2. For each milestone:

   a. Check `entityassignments`:
   ```
   entity-assignments-list { orgId: "<orgId>", entityType: "milestone", entityId: "<milestone_id>" }
   ```

   b. Check `assigneeId` field on the milestone itself.

3. **Check criteria:**

   | Check | Pass Condition | Issue Type |
   |-------|---------------|------------|
   | Has owner assignment | Assignment with `role: "owner"` exists | `milestone-no-owner` |
   | assigneeId set | `assigneeId` field is non-null | `milestone-no-assignee` |
   | assigneeId matches | `assigneeId` matches the owner assignment's `teamMemberId` | `milestone-assignee-mismatch` |

### Done when

- All milestones checked for owner assignments
- Issues logged and resolution attempted

---

## Step 5: Audit Tasks

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query all active tasks (not archived/deleted):
   ```
   collection-query tasks { "orgId": "<orgId>", "status": { "$ne": "Archived" } }
   ```

2. For each task:

   a. Check `entityassignments`:
   ```
   entity-assignments-list { orgId: "<orgId>", entityType: "task", entityId: "<task_id>" }
   ```

   b. Check `assigneeId` field on the task.

   c. Check `userId` field on the task (who created it).

3. **Check criteria:**

   | Check | Pass Condition | Issue Type |
   |-------|---------------|------------|
   | Has owner | Assignment with `role: "owner"` or `assigneeId` set | `task-no-owner` |
   | userId set | `userId` field is non-null and non-empty | `task-no-userId` |
   | userId valid | `userId` matches a known `teamMemberId` | `task-invalid-userId` |

### Done when

- All active tasks checked for ownership and userId
- Issues logged and resolution attempted

---

## Step 6: Audit Discussions

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query all discussions:
   ```
   collection-query discussions { "orgId": "<orgId>" }
   ```

2. For each discussion, check identity fields.

3. **Check criteria:**

   | Check | Pass Condition | Issue Type |
   |-------|---------------|------------|
   | userName set | `userName` is non-null and not empty | `discussion-no-userName` |
   | userName valid | `userName` is NOT "Claude", "claude-code", "System" | `discussion-invalid-userName` |
   | userId set | `userId` is non-null and non-empty | `discussion-no-userId` |
   | userId valid | `userId` matches a known `teamMemberId` | `discussion-invalid-userId` |

4. For invalid userName values, determine the correct identity:
   - Check `userId` field; if set, look up the team member's `characterName`
   - Check the parent entity's `assigneeId` or owner assignment
   - If neither resolves, flag for manual review

### Done when

- All discussions checked for proper identity attribution
- Invalid "Claude" / "claude-code" userNames identified and corrected

---

## Step 7: Audit Documents

**Who:** Assigned agent
**Pause:** No

### Actions

1. List all documents:
   ```
   document-list { orgId: "<orgId>" }
   ```

2. For each document, check `userId` attribution.

3. **Check criteria:**

   | Check | Pass Condition | Issue Type |
   |-------|---------------|------------|
   | userId set | `userId` field is non-null | `document-no-userId` |
   | userId valid | `userId` matches a known `teamMemberId` | `document-invalid-userId` |

### Done when

- All documents checked for userId attribution
- Issues logged and resolution attempted

---

## Step 8: Audit Approvals

**Who:** Assigned agent
**Pause:** No

### Actions

1. Query all approvals:
   ```
   collection-query approvals { "orgId": "<orgId>" }
   ```

2. For each approval, check identity fields.

3. **Check criteria:**

   | Check | Pass Condition | Issue Type |
   |-------|---------------|------------|
   | userId set | `userId` field is non-null | `approval-no-userId` |
   | userId valid | `userId` matches a known `teamMemberId` | `approval-invalid-userId` |

### Done when

- All approvals checked
- Issues logged

---

## Step 9: Cross-Entity Consistency

**Who:** Assigned agent
**Pause:** No

### Actions

1. For each product in `.flowstate/config.json`:
   - Get its `productId` and `businessPlanId`
   - Get its `projectIds`
   - Compare team membership across all three

2. **Check criteria:**

   | Check | Pass Condition | Issue Type |
   |-------|---------------|------------|
   | Product-bizplan alignment | Product leads appear in bizplan team | `cross-product-bizplan-mismatch` |
   | Product-project alignment | Product team overlaps with project assignments | `cross-product-project-mismatch` |
   | Bizplan-project alignment | Bizplan leads have project assignments | `cross-bizplan-project-mismatch` |

3. This step identifies organizational gaps, not individual entity errors. Flag misalignments for review rather than auto-correcting.

### Done when

- Cross-entity team consistency checked
- Misalignments flagged

---

## Step 10: Generate Report & Correct

**Who:** Assigned agent
**Pause:** Yes (if corrections need approval)

### Actions

1. Compile the full audit report:

   ```markdown
   ## Entity Audit Report

   **Date:** <YYYY-MM-DD>
   **Org:** <orgId>

   ### Summary

   | Entity Type | Checked | Issues | Corrected |
   |-------------|---------|--------|-----------|
   | Products | <n> | <n> | <n> |
   | Business Plans | <n> | <n> | <n> |
   | Projects | <n> | <n> | <n> |
   | Milestones | <n> | <n> | <n> |
   | Tasks | <n> | <n> | <n> |
   | Discussions | <n> | <n> | <n> |
   | Documents | <n> | <n> | <n> |
   | Approvals | <n> | <n> | <n> |

   ### Issues Found

   | # | Entity | ID | Issue | Resolution |
   |---|--------|-----|-------|------------|
   | 1 | discussion | disc_xxx | userName is "Claude" | Corrected to "FlowState Coordinator" |
   | 2 | task | task_xxx | No owner assignment | Assigned to team_xxx |
   | ... | | | | |

   ### Unresolved Issues

   Items that could not be auto-corrected and need manual review.

   ### Cross-Entity Gaps

   Team alignment issues between products, bizplans, and projects.
   ```

2. Post the report as a discussion on the workspace or a designated audit entity.

3. If corrections were applied, list them for user confirmation.

### Done when

- Audit report generated
- All auto-corrections applied
- Unresolved issues flagged for manual review

---

## Resolution Strategies

When an issue is found, use these strategies to determine the correct value:

### Resolving Missing userId

| Source Priority | Method |
|----------------|--------|
| 1. Entity assigneeId | If the entity has `assigneeId`, use that as `userId` |
| 2. Parent entity owner | Find the owner assignment on the parent (milestone -> project -> product) |
| 3. Entity creator context | Check the entity's `createdAt` timestamp against time entries |
| 4. Config product team | For product-related entities, use the product lead's `teamMemberId` |
| 5. Coordinator fallback | Use coordinator `team_ahMTwGVNGX` only if no other source resolves |

### Resolving Invalid userName

| Value Found | Resolution |
|-------------|------------|
| "Claude" | Look up `userId` -> get characterName from team member/agent |
| "claude-code" | Same as above |
| "System" | Same as above |
| Empty string | Same as above |
| Agent kebab-name | Look up agent JSON -> get characterName |

### Resolving Missing Team Linking

| Entity Type | Resolution |
|-------------|------------|
| Product with no team | Query product owners from `entityassignments`, add via `product-add-team-member` |
| Bizplan with no team | Use product team as base, add via `bizplan-add-team-member` with RACI template |
| Project with no owner | Find creating agent from project `userId` or linked product lead |

### Auto-Correction Rules

Corrections are applied automatically for:
- Setting `userId` when it can be unambiguously resolved
- Fixing `userName` when `userId` is valid and maps to a known team member
- Creating missing owner assignments when `assigneeId` is set on the entity

Corrections that require approval:
- Creating team member links on products/bizplans (changes organizational structure)
- Changing `assigneeId` on entities (changes ownership)
- Any correction where the resolution is ambiguous (multiple candidates)

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Team member query returns empty | Check if `orgId` is correct, verify team members exist |
| Agent JSON missing teamMemberId | Flag the agent definition as incomplete |
| Entity not found during correction | Skip, log as "entity deleted during audit" |
| userId resolves to non-existent member | Flag for manual review, do not auto-correct |
| Bulk query returns too many results | Paginate using `limit` and `skip` parameters |
| MCP tool rate limit | Add delay between corrections, batch where possible |

---

## Running the Audit

### Full Audit

Run all steps 0-10 sequentially. Produces a complete report.

### Scoped Audit

Run specific steps based on concern:

| Concern | Steps to Run |
|---------|-------------|
| Identity attribution only | 0, 5, 6, 7, 8 |
| Team linking only | 0, 1, 2, 3 |
| Owner assignments only | 0, 3, 4, 5 |
| Cross-entity consistency | 0, 1, 2, 3, 9 |
| Post-creation verification | 0, then specific step for the entity type |

### Single Entity Audit

To audit a specific entity:

1. Load context (Step 0)
2. Query the entity and its assignments
3. Run the relevant checks from the matching step
4. Correct issues found

---

## Conventions

| Item | Convention |
|------|-----------|
| Audit frequency | After any bulk entity creation or identity fix |
| Report format | Markdown table in a FlowState discussion |
| Auto-correct scope | Only unambiguous corrections without approval |
| Ambiguous corrections | Create approval for human review |
| Coordinator as fallback | Only when no other identity can be determined |
| Agent definitions | Always read from `.flowstate/agents/` |
| Team member lookup | Always from `teammembers` collection query |
| Cross-reference | `flowstate-agent-identity` for identity resolution |
| Cross-reference | `flowstate-entity-assignment` for assignment operations |

---

_Created: 2026-03-30_
