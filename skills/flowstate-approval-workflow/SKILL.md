---
name: flowstate-approval-workflow
description: Use when any process needs human review, gating, or decision points - provides the standard approval creation, response routing, pause/resume, and revision loop patterns used across all FlowState workflows
---

# FlowState Approval Workflow

**Purpose:** Standard approval pattern for gating process steps on human review
**Scope:** All FlowState processes that require human input, review, or decision-making
**Used by:** Brainstorming, multi-phase planning, process execution, visual companion, and any custom process

---

## Overview

Approvals are the primary coordination mechanism between agents and humans in FlowState. An approval record gates a process step: the agent creates the approval, pauses execution, and resumes only after a human responds.

```
Agent does work → Creates approval (status: pending) → Pauses
                                                         ↓
Human reviews in FlowState UI → Sets response → Agent resumes
                                                         ↓
Agent reads response → Routes: approved | needs-revision | rejected
```

---

## Creating an Approval

Every approval requires these fields:

| Field             | Type   | Required | Description                                          |
| ----------------- | ------ | -------- | ---------------------------------------------------- |
| `projectId`       | string | Yes      | Parent project ID                                    |
| `milestoneId`     | string | No       | Parent milestone ID (if applicable)                  |
| `documentId`      | string | No       | Linked document ID (if reviewing a document)         |
| `taskId`          | string | No       | Linked task ID (if reviewing task output)            |
| `title`           | string | Yes      | Human-readable title (follows naming convention)     |
| `type`            | string | Yes      | Process-specific type (see Approval Types below)     |
| `category`        | string | Yes      | Process category for grouping                        |
| `categoryName`    | string | Yes      | Human-readable category name                         |
| `status`          | string | Yes      | Always `"pending"` when creating                     |
| `documentType`    | string | No       | What's being reviewed: `question`, `proposals`, etc. |
| `documentContent` | string | No       | The content being reviewed (inline)                  |
| `orgId`           | string | Yes      | Organization ID from entity context                  |

### Creation template

```
collection-create approvals {
  projectId: "<project_id>",
  milestoneId: "<milestone_id>",
  documentId: "<document_id>",
  title: "<descriptive title>",
  type: "<process-type>",
  category: "<category>",
  categoryName: "<Category Name>",
  status: "pending",
  documentType: "<what is being reviewed>",
  documentContent: "<content or summary>",
  orgId: "<orgId>"
}
```

### Best practices

- **Always create a discussion first**, then the approval — the discussion provides context, the approval gates the decision
- **One approval per decision** — do not batch multiple questions into a single approval
- **Include enough context** in `documentContent` that the reviewer can decide without reading the full codebase
- **Link to documents** via `documentId` when the approval reviews a FlowState document

---

## Reading Approval Responses

After pausing on a human-task step, fetch the approval and read:

| Field         | Contains                                                        |
| ------------- | --------------------------------------------------------------- |
| `response`    | `"approved"`, `"needs-revision"`, or `"rejected"`               |
| `comments`    | Reviewer's feedback text (free-form)                            |
| `annotations` | Structured data (section names, line numbers, specific changes) |
| `status`      | `"approved"`, `"rejected"`, or `"revision-requested"`           |

### Reading template

```
collection-get approvals <approval_id>
```

**Route on `response`, not `status`.** The `response` field contains the reviewer's intent. The `status` field reflects the approval record state and may differ in edge cases.

---

## Response Routing

Every approval supports three responses:

| Response         | Action                                               |
| ---------------- | ---------------------------------------------------- |
| `approved`       | Proceed to the next step in the process              |
| `needs-revision` | Read `comments` for feedback, revise work, resubmit  |
| `rejected`       | Return to an earlier step, escalate, or halt process |

### Routing pattern

```
1. Fetch approval response
2. If "approved" → advance to next step
3. If "needs-revision" → read comments → revise → create NEW approval → pause again
4. If "rejected" → return to earlier step or halt with status update
```

**On revision:** Always create a **new** approval record for the revised work. Do not update the old approval — it serves as an audit trail of the review history.

---

## Pause/Resume Pattern

### Pausing

When a process reaches an approval gate:

1. Create the discussion (context for the reviewer)
2. Create the approval (status: pending)
3. Report the pause to the user:
   ```
   Process paused at: <step title>
   Waiting for approval: <approval_id>
   Approval type: <type>
   Review in FlowState UI, then resume this process.
   ```
4. **Stop execution.** Do not proceed until the approval is resolved.

### Resuming

When the process resumes after an approval:

1. Fetch the approval by ID:
   ```
   collection-get approvals <approval_id>
   ```
2. Check that `status` is no longer `"pending"` — if still pending, the process should not resume
3. Read `response` and `comments`
4. Route based on `response` (see Response Routing above)
5. Continue execution from the current step

---

## Revision Loop

When a reviewer responds with `needs-revision`:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Agent creates work → Approval (pending)        │
│       ↑                    ↓                    │
│       │              Human reviews              │
│       │                    ↓                    │
│       │         Response: needs-revision         │
│       │                    ↓                    │
│       └──── Agent reads comments, revises ──────│
│                                                 │
│  Loop exits when response = "approved"          │
└─────────────────────────────────────────────────┘
```

### Revision guidelines

- Read the **full `comments` text** — do not skim or skip feedback
- Address **all** feedback points, not just the first one
- Create a **new version** of the work (new document version, new discussion post)
- Create a **new approval** linking to the revised work
- Reference the previous approval in the discussion so reviewers can see the revision history

---

## Approval Types Convention

Approval types follow the pattern `<process>-<purpose>`:

| Process              | Type                         | Category        | When Used                                |
| -------------------- | ---------------------------- | --------------- | ---------------------------------------- |
| Brainstorming        | `brainstorm-question`        | `brainstorming` | Clarifying questions needing human input |
| Brainstorming        | `brainstorm-approach`        | `brainstorming` | Selecting between proposed approaches    |
| Brainstorming        | `brainstorm-design-section`  | `brainstorming` | Per-section design review                |
| Brainstorming        | `brainstorm-design-approval` | `brainstorming` | Complete design approval                 |
| Brainstorming        | `brainstorm-spec-review`     | `brainstorming` | Final written spec review                |
| Multi-Phase Planning | `phase-decomposition`        | `planning`      | Phase breakdown approval                 |
| Visual Companion     | `visual-review`              | `visual`        | Visual document review                   |
| Custom Process       | `<process>-<purpose>`        | `<process>`     | Follow the naming convention             |

### Adding new approval types

When creating a new process that needs approvals:

1. Choose a `category` that groups related approvals (e.g., `brainstorming`, `planning`, `visual`)
2. Create `type` values following `<category>-<purpose>` naming
3. Set `categoryName` to a human-readable version of the category
4. Document the types in your process skill's reference section

---

## Querying Approvals

### Find pending approvals for a project

```
collection-query approvals {
  "projectId": "<project_id>",
  "status": "pending"
}
```

### Find approvals by type

```
collection-query approvals {
  "type": "<approval_type>",
  "projectId": "<project_id>"
}
```

### Find approval for a specific document

```
collection-query approvals {
  "documentId": "<document_id>",
  "status": "pending"
}
```

---

## Integration with Other Skills

This approval workflow is used by:

- **`flowstate-brainstorming`** — 5 approval gates across the brainstorming process
- **`flowstate-multi-phase-planning`** — Phase decomposition approval
- **`flowstate-process-execution`** — Generic approval handling for any registered process
- **`flowstate-visual-companion`** — Visual document review cycle

When building a new skill that needs human review gates, invoke `flowstate-skills:flowstate-approval-workflow` for the approval pattern, then apply it to your process-specific context.

---

## Error Handling

| Situation                         | Action                                                        |
| --------------------------------- | ------------------------------------------------------------- |
| Approval not found by ID          | Query by `type` + `projectId` to find it                      |
| Approval still pending on resume  | Do not proceed — inform user the approval needs a response    |
| Approval timeout (no response)    | Create a reminder discussion on the entity, re-send approval  |
| Multiple pending approvals exist  | Process the oldest one first (by `createdAt`)                 |
| Reviewer left no comments         | Treat as approved with no revision notes                      |
| `comments` reference unknown item | Ask for clarification via a new `<process>-question` approval |

---

_Created: 2026-03-29_
