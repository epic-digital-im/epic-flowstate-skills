---
name: flowstate-process-registration
description: Use when converting a process markdown document into executable FlowState records - creates one processes entry and N processsteps records linked by nextStepId chains. Required before process can run via flowstate-process-execution.
---

# Process Registration

**Status:** Active
**Purpose:** Steering instructions for converting process documentation into FlowState `processes` and `processsteps` records via MCP tools
**Scope:** All process documents in `.flowstate/docs/process/`
**Output:** A fully registered process with linked steps, ready for execution via [Process Execution via MCP](process-execution-via-mcp.md)

---

## Overview

Process documents describe workflows in human-readable markdown. Process registration converts them into executable FlowState records: one `processes` entry and N `processsteps` entries linked by `nextStepId` chains.

Some processes are standalone (brainstorming-design). Others are sub-processes called from within larger processes (document-creation is called from task-execution Step 1 and Step 6; task-execution is called from brainstorming Step 8). The registration process handles both cases.

```
Read Process Doc -> Analyze Steps -> Identify Sub-Processes -> Design Step Graph
     (1)                (2)                  (3)                    (4)
                                                                     |
                                                                     v
       Verify <- Create Steps <- Create Process <- Plan IDs & Naming
        (8)          (7)             (6)                (5)
```

---

## Prerequisites

Before registering a process:

1. The process document exists in `.flowstate/docs/process/`
2. You have the correct `orgId` and `workspaceId` from `.flowstate/config.json`
3. You understand the process well enough to decompose every step

---

## Step 1: Read the Process Document

Read the source document and extract:

| Extract                | Where to find it                                                         |
| ---------------------- | ------------------------------------------------------------------------ |
| Process name           | Document title                                                           |
| Purpose                | `**Purpose:**` metadata                                                  |
| Trigger                | `**Trigger:**` metadata                                                  |
| Scope                  | `**Scope:**` metadata                                                    |
| Step list              | `## Step N:` headers                                                     |
| Approval types         | Approval Types Reference table (if present)                              |
| Loops/feedback         | Process Diagram and decision points                                      |
| Sub-process references | Links to other process docs (e.g., "see `document-creation-process.md`") |
| Error handling         | Error Handling table                                                     |

---

## Step 2: Analyze Steps

For each step in the document, determine:

### Step type mapping

| Document pattern                                                               | stepType     | Indicators                                      |
| ------------------------------------------------------------------------------ | ------------ | ----------------------------------------------- |
| "Fetch entity", "Update status", "Create discussion", "Create approval"        | `action`     | Direct MCP tool call, no agent reasoning needed |
| "Agent explores codebase", "Write plan", "Generate content", "Compile summary" | `agent-task` | Requires Claude Code to read/write/reason       |
| "Pause. Wait for approval", "Wait for response"                                | `human-task` | Execution stops until human acts                |
| "If approved... If needs-revision... If rejected..."                           | `decision`   | Routes flow based on variable values            |
| Process entry point                                                            | `start`      | First step, no preceding step                   |
| Process terminal                                                               | `end`        | Last step, no following step                    |
| "See `other-process.md`", "Follow document-creation-process"                   | `subprocess` | Delegates to another registered process         |

### Decomposition rules

**Split compound steps.** Process documents often bundle multiple actions into one step for readability. Each discrete MCP call or agent task should be its own processstep.

Example: The brainstorming-process.md "Step 2: Clarifying Questions" is one step in the document but became 5 processsteps:

| Document                     | Database                                                  |
| ---------------------------- | --------------------------------------------------------- |
| Step 2: Clarifying Questions | `step_bd_post_questions` (action: create discussion)      |
|                              | `step_bd_question_approval` (action: create approval)     |
|                              | `step_bd_wait_answer` (human-task: wait for approval)     |
|                              | `step_bd_record_answer` (action: create reply discussion) |
|                              | `step_bd_check_more_qs` (decision: loop or continue)      |

**The rule:** One MCP tool call = one action step. One pause = one human-task step. One routing decision = one decision step. One block of agent reasoning = one agent-task step.

### Identify loops

Look for these patterns in the document:

| Pattern                                    | Loop type          |
| ------------------------------------------ | ------------------ |
| "Repeat from action 1"                     | Explicit loop back |
| "If needs-revision... revise and resubmit" | Revision loop      |
| "Continue until all X are complete"        | Iteration loop     |
| Steps 6 -> 7 -> 6 (code review cycle)      | Re-review loop     |

Each loop needs a decision step that routes either forward (exit the loop) or backward (repeat).

---

## Step 3: Identify Sub-Processes

Scan the document for references to other process documents. These become `subprocess` step types.

### Finding sub-process references

| Signal             | Example                                                             |
| ------------------ | ------------------------------------------------------------------- |
| Explicit link      | "follows [Document Creation Process](document-creation-process.md)" |
| Inline reference   | "see `document-creation-process.md`"                                |
| Skill invocation   | "Invoke the `flowstate-writing-plans` skill"                        |
| Template reference | "Create all 10 sub-tasks from the sub-task template"                |
| Process transition | "begin Step 0 for that task (repeat the full process)"              |

### Sub-process step structure

When a step delegates to another process, create a `subprocess` step:

```json
{
  "stepType": "subprocess",
  "action": {
    "type": "subprocess",
    "processId": "<child_process_id>",
    "processName": "<child_process_name>",
    "inputMapping": {
      "entityId": "{{entityId}}",
      "orgId": "{{orgId}}"
    }
  }
}
```

### Process hierarchy

Map the parent-child relationships before creating records:

```
brainstorming-design
  └── Step 7 (write spec) -> subprocess: document-creation
  └── Step 8 (transition)  -> subprocess: task-execution

task-execution
  └── Step 0 (setup)    -> subprocess: subtask-creation
  └── Step 1 (plan)     -> subprocess: document-creation
  └── Step 6 (review)   -> subprocess: document-creation (for review doc)
  └── Step 9 (complete) -> self-reference: task-execution (next task)

document-creation
  (leaf process, no sub-processes)

subtask-creation
  (leaf process, no sub-processes)
```

Register leaf processes first, then parent processes that reference them. This ensures `processId` references are valid.

### Registration order

1. `document-creation` (leaf, referenced by task-execution and brainstorming)
2. `subtask-creation` (leaf, referenced by task-execution)
3. `task-execution` (references document-creation, subtask-creation, self)
4. `brainstorming-design` (references document-creation, task-execution) - already registered

---

## Step 4: Design the Step Graph

Before creating any records, plan the full step graph on paper (or in your context).

### 4a. Assign step IDs

Use a consistent naming convention:

```
step_<process_prefix>_<step_name>
```

| Process              | Prefix | Example         |
| -------------------- | ------ | --------------- |
| brainstorming-design | `bd`   | `step_bd_start` |
| task-execution       | `te`   | `step_te_start` |
| document-creation    | `dc`   | `step_dc_start` |
| subtask-creation     | `sc`   | `step_sc_start` |

Step names should be short, descriptive, and use underscores:

```
step_te_start
step_te_fetch_task
step_te_set_in_progress
step_te_create_subtasks
step_te_write_plan
step_te_create_plan_doc       # subprocess: document-creation
step_te_create_worktree
step_te_execute_dev
step_te_update_results
step_te_push_branch
step_te_create_pr
step_te_dispatch_review
step_te_wait_review
step_te_check_review
step_te_fix_issues
step_te_re_review_check
step_te_merge_pr
step_te_cleanup_worktree
step_te_mark_complete
step_te_check_milestone
step_te_check_next_task
step_te_end
```

### 4b. Assign order numbers

Sequential integers starting at 0. Order determines the display sequence, not the execution sequence (execution follows `nextStepId`).

### 4c. Map the nextStepId chain

Draw the chain including all branches:

```
start(0) -> fetch_task(1) -> set_in_progress(2) -> create_subtasks(3)
-> write_plan(4) -> create_plan_doc(5) -> create_worktree(6)
-> execute_dev(7) -> update_results(8) -> push_branch(9) -> create_pr(10)
-> dispatch_review(11) -> wait_review(12) -> check_review(13)
   |-- "clean" -> merge_pr(16)
   |-- "has_issues" -> fix_issues(14) -> re_review_check(15)
       |-- "has_critical" -> dispatch_review(11)  [loop]
       |-- "all_resolved" -> merge_pr(16)
merge_pr(16) -> cleanup_worktree(17) -> mark_complete(18)
-> check_milestone(19) -> check_next_task(20)
   |-- "has_next" -> [subprocess: task-execution]
   |-- "no_next" -> end(21)
```

### 4d. Define inputs and outputs

For each step, identify:

| Direction | Field                          | Source                                                                     |
| --------- | ------------------------------ | -------------------------------------------------------------------------- |
| Input     | What variables this step needs | `source: "variable"` (from store) or `source: "previous"` (from last step) |
| Output    | What this step produces        | `source: "result"` with `jsonPath` for MCP responses                       |

### 4e. Define conditions for decision steps

Each decision step needs conditions in `metadata.conditions`:

```json
{
  "metadata": {
    "conditions": [
      {
        "when": "<variable_name>",
        "equals": "<expected_value>",
        "nextStepId": "<target_step_id>"
      }
    ],
    "decisionType": "<variable-check|approval-response|threshold>"
  }
}
```

Common decision types:

| Type                | When to use                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| `approval-response` | Routing based on approval `response` field (approved/needs-revision/rejected) |
| `variable-check`    | Routing based on boolean or string variable                                   |
| `threshold`         | Routing based on numeric comparison (e.g., confidence >= 80)                  |

---

## Step 5: Plan IDs and Naming

### Process ID convention

```
proc_<descriptive_name>
```

Examples:

- `proc_brainstorm_design` (already registered)
- `proc_task_execution`
- `proc_document_creation`
- `proc_subtask_creation`

### Process record fields

| Field                   | Source                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| `id`                    | Your chosen process ID                                               |
| `name`                  | kebab-case identifier (e.g., `task-execution`)                       |
| `title`                 | Human-readable title from the document                               |
| `description`           | From the document's `**Purpose:**` field                             |
| `category`              | Process family (e.g., `execution`, `brainstorming`, `documentation`) |
| `status`                | `active`                                                             |
| `enabled`               | `true`                                                               |
| `archived`              | `false`                                                              |
| `version`               | `1`                                                                  |
| `metadata.stepIds`      | Array of all step IDs in order                                       |
| `metadata.trigger`      | From the document's `**Trigger:**` field                             |
| `metadata.sourceDoc`    | Relative path to the process document                                |
| `metadata.subProcesses` | Array of child process IDs this process calls                        |

---

## Step 6: Create the Process Record

```
collection-create processes {
  id: "<process_id>",
  name: "<process-name>",
  title: "<Process Title>",
  description: "<purpose from the document>",
  category: "<category>",
  status: "active",
  enabled: true,
  archived: false,
  version: 1,
  orgId: "<orgId>",
  workspaceId: "<workspaceId>",
  metadata: {
    stepIds: ["step_xx_start", "step_xx_step1", ...],
    trigger: "<trigger condition>",
    sourceDoc: ".flowstate/docs/process/<filename>.md",
    subProcesses: ["proc_child1", "proc_child2"]
  }
}
```

---

## Step 7: Create Process Steps

Create each step via `collection-create processsteps`. All steps share:

```json
{
  "orgId": "<orgId>",
  "workspaceId": "<workspaceId>",
  "processId": "<process_id>",
  "optional": false,
  "enabled": true,
  "archived": false
}
```

### Create steps in batches

Group steps by phase and create in parallel batches of 4-5 steps. Steps within a batch have no creation-order dependency.

### Step templates by type

**Start step:**

```json
{
  "id": "step_xx_start",
  "name": "start",
  "title": "Start",
  "description": "Process entry point.",
  "stepType": "start",
  "order": 0,
  "nextStepId": "step_xx_first_action"
}
```

**Action step (MCP tool):**

```json
{
  "id": "step_xx_fetch_entity",
  "name": "fetch_entity",
  "title": "Fetch Entity",
  "description": "Fetch the entity from FlowState to get context.",
  "stepType": "action",
  "order": 1,
  "nextStepId": "step_xx_next",
  "action": {
    "type": "mcp-tool",
    "tool": "collection-get",
    "params": {
      "collection": "{{entityCollection}}",
      "id": "{{entityId}}"
    }
  },
  "inputs": {
    "entityCollection": { "source": "variable", "jsonPath": "$.entityCollection" },
    "entityId": { "source": "variable", "jsonPath": "$.entityId" }
  },
  "outputs": {
    "entityTitle": { "source": "result", "jsonPath": "$.document.title" }
  }
}
```

**Agent-task step:**

```json
{
  "id": "step_xx_write_plan",
  "name": "write_plan",
  "title": "Write Implementation Plan",
  "description": "Agent writes the implementation plan following the flowstate-writing-plans skill.",
  "stepType": "agent-task",
  "order": 4,
  "nextStepId": "step_xx_next",
  "action": {
    "type": "agent-task",
    "agentType": "<agent-role>",
    "prompt": "Read the task requirements and write an implementation plan. Save to docs/plans/..."
  },
  "inputs": {
    "taskDescription": { "source": "variable", "jsonPath": "$.entityDescription" }
  },
  "outputs": {
    "planFilePath": { "source": "result", "jsonPath": "$.planFilePath" }
  }
}
```

**Human-task step (approval wait):** _(see `flowstate-approval-workflow` for the full approval pattern)_

```json
{
  "id": "step_xx_wait_approval",
  "name": "wait_approval",
  "title": "Wait for Approval",
  "description": "Pause and wait for the approval to be resolved.",
  "stepType": "human-task",
  "order": 8,
  "nextStepId": "step_xx_check_response",
  "action": {
    "type": "wait-approval",
    "approvalId": "{{approvalId}}"
  },
  "inputs": {
    "approvalId": { "source": "previous", "jsonPath": "$.approvalId" }
  },
  "outputs": {
    "response": { "source": "result", "jsonPath": "$.response" },
    "comments": { "source": "result", "jsonPath": "$.comments" }
  }
}
```

**Decision step:**

```json
{
  "id": "step_xx_check_response",
  "name": "check_response",
  "title": "Route Response",
  "description": "Route based on approval response.",
  "stepType": "decision",
  "order": 9,
  "nextStepId": "step_xx_default_next",
  "conditions": {},
  "metadata": {
    "conditions": [
      { "when": "response", "equals": "approved", "nextStepId": "step_xx_approved_path" },
      { "when": "response", "equals": "needs-revision", "nextStepId": "step_xx_revision_path" },
      { "when": "response", "equals": "rejected", "nextStepId": "step_xx_rejected_path" }
    ],
    "decisionType": "approval-response"
  }
}
```

**Subprocess step:**

```json
{
  "id": "step_xx_create_document",
  "name": "create_document",
  "title": "Create FlowState Document",
  "description": "Delegate to the document-creation process.",
  "stepType": "subprocess",
  "order": 5,
  "nextStepId": "step_xx_after_subprocess",
  "action": {
    "type": "subprocess",
    "processId": "proc_document_creation",
    "processName": "document-creation",
    "inputMapping": {
      "documentTitle": "{{planTitle}}",
      "documentContent": "{{planContent}}",
      "documentType": "plan",
      "projectId": "{{projectId}}",
      "milestoneId": "{{milestoneId}}",
      "localPath": "{{planFilePath}}"
    }
  },
  "inputs": {
    "planTitle": { "source": "variable", "jsonPath": "$.planTitle" },
    "planContent": { "source": "variable", "jsonPath": "$.planContent" },
    "planFilePath": { "source": "previous", "jsonPath": "$.planFilePath" }
  },
  "outputs": {
    "documentId": { "source": "result", "jsonPath": "$.documentId" }
  }
}
```

**End step:**

```json
{
  "id": "step_xx_end",
  "name": "end",
  "title": "Process Complete",
  "description": "Terminal step.",
  "stepType": "end",
  "order": 99
}
```

### Schema constraints

These constraints apply to all processstep records (discovered during brainstorming-design registration):

| Field        | Constraint                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------- |
| `outputs`    | Must be an object, not an array. Use `{ "varName": { "source": "...", "jsonPath": "..." } }` |
| `conditions` | Must be an object, not an array. Store condition arrays in `metadata.conditions` instead     |
| `order`      | Integer, not string                                                                          |
| `optional`   | Boolean, required                                                                            |
| `enabled`    | Boolean, required                                                                            |
| `archived`   | Boolean, required                                                                            |

---

## Step 8: Verify Registration

After creating all records, verify the process is complete.

### 8a. Count steps

```
collection-query processsteps {
  "processId": "<process_id>"
}
sort: [{ "order": "asc" }]
```

Confirm the count matches your plan from Step 4.

### 8b. Verify chain integrity

Check that every step's `nextStepId` points to an existing step:

1. Query all steps
2. Build a set of all step IDs
3. For each step with a `nextStepId`, verify the target exists in the set
4. For each decision step, verify all `metadata.conditions[].nextStepId` targets exist
5. Verify exactly one `start` step and at least one `end` step exist

### 8c. Verify subprocess references

For every `subprocess` step, confirm the referenced `processId` exists:

```
collection-get processes <child_process_id>
```

### 8d. Update the process document

Add a FlowState reference block to the source process document:

```markdown
> **FlowState Process:** `<process_id>`
> **Steps:** <step_count>
> **Sub-Processes:** `<child_id_1>`, `<child_id_2>`
```

---

## Process Catalog

Registered processes and their relationships:

```
proc_brainstorm_design (32 steps)
  ├── subprocess: proc_document_creation  (spec creation)
  └── subprocess: proc_multi_phase_planning (transition to planning)

proc_multi_phase_planning (18 steps)
  └── subprocess: proc_document_creation  (Step 12: plan doc creation)

proc_task_execution (25 steps)
  ├── subprocess: proc_subtask_creation   (Step 3: create sub-tasks)
  ├── subprocess: proc_document_creation  (Step 5: plan doc, Step 14: review doc)
  └── self-loop: proc_task_execution      (Step 23: next task in milestone)

proc_document_creation (9 steps)
  └── (leaf process, no sub-processes)

proc_subtask_creation (6 steps)
  └── (leaf process, no sub-processes)

proc_process_execution (13 steps)
  └── (standalone meta-process, no sub-processes)

proc_process_registration (14 steps)
  └── (standalone meta-process, no sub-processes)

proc_workspace_codebase_audit (17 steps)
  └── (standalone process, no sub-processes)

proc_project_audit (document only, not registered)
  └── (standalone process, no sub-processes)
```

| Process                         | Source Document                       | Status                           |
| ------------------------------- | ------------------------------------- | -------------------------------- |
| `proc_brainstorm_design`        | `brainstorming-process.md`            | Registered (32 steps)            |
| `proc_multi_phase_planning`     | `multi-phase-planning-process.md`     | Registered (18 steps)            |
| `proc_task_execution`           | `task-execution-process.md`           | Registered (25 steps)            |
| `proc_document_creation`        | `document-creation-process.md`        | Registered (9 steps)             |
| `proc_subtask_creation`         | `subtask-template.md`                 | Registered (6 steps)             |
| `proc_process_execution`        | `process-execution-via-mcp.md`        | Registered (13 steps)            |
| `proc_process_registration`     | `process-registration.md`             | Registered (14 steps)            |
| `proc_workspace_codebase_audit` | `workspace-codebase-audit-process.md` | Registered (17 steps)            |
| `proc_project_audit`            | `project-audit-process.md`            | Document written, not registered |

---

## Worked Example: Brainstorming Process

The `proc_brainstorm_design` registration demonstrates all patterns:

### Source document analysis

`brainstorming-process.md` has 9 document steps (Step 0 through Step 8). After decomposition, these became 32 processsteps because compound steps were split:

| Document Step                | Process Steps Created              | Why                                                                           |
| ---------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| Step 0: Read Entity          | 3 steps (start, fetch, set status) | Entry point + two MCP calls                                                   |
| Step 1: Context Research     | 1 step (agent-task)                | Single agent task                                                             |
| Step 2: Clarifying Questions | 6 steps                            | Generate + confidence check + post + approval + wait + record + loop decision |
| Step 3: Approach Proposals   | 4 steps                            | Generate + create doc + create approval + wait                                |
| Step 4: Design Sections      | 5 steps                            | Generate + post + approval + wait + route                                     |
| Step 5: Design Approval      | 4 steps                            | Assemble + approval + wait + route                                            |
| Step 6: Revision Loop        | 0 steps                            | Handled by decision step routing back                                         |
| Step 7: Write Design Doc     | 5 steps                            | Write + create doc + approval + wait + route                                  |
| Step 8: Transition           | 3 steps                            | Create tasks + remove tag + end                                               |

### Sub-process candidates identified

- Step 7 references `document-creation-process.md` for spec creation
- Step 8 transitions to `task-execution-process.md`

In the initial registration, these were kept as agent-task and action steps. When the child processes are registered, these steps can be updated to `subprocess` type.

### Key patterns used

| Pattern           | Steps                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| Sequential chain  | start -> fetch -> set_status                                                                                     |
| Question loop     | gen_questions -> check_confidence -> post -> approval -> wait -> record -> check_more -> [back to gen_questions] |
| Section iteration | gen_section -> post -> approval -> wait -> check -> [back to gen_section or forward to assemble]                 |
| Approval gate     | create_approval -> wait -> check_response -> [approved / needs-revision / rejected]                              |
| Revision loop     | check_response(needs-revision) -> back to generation step                                                        |

---

## Error Handling

| Situation                               | Action                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| Schema validation error on `outputs`    | Use object format `{ "varName": { ... } }`, not array format                   |
| Schema validation error on `conditions` | Store conditions array in `metadata.conditions`, leave `conditions: {}`        |
| Step ID collision                       | Query existing steps for the process first. Delete or rename conflicts         |
| Wrong orgId                             | Read from `.flowstate/config.json`: `org_9f3omFEY2H`                           |
| Subprocess target not registered yet    | Register leaf processes first, then parents                                    |
| Step count mismatch after creation      | Re-query and compare against your plan                                         |
| Circular nextStepId chain               | Loops must have a decision step that can exit. No unconditional infinite loops |

---

## Conventions

| Item               | Convention                                                                  |
| ------------------ | --------------------------------------------------------------------------- |
| Process ID         | `proc_<descriptive_name>`                                                   |
| Step ID            | `step_<process_prefix>_<step_name>`                                         |
| Step name          | snake_case, descriptive                                                     |
| Conditions         | Stored in `metadata.conditions` as array                                    |
| Decision type      | `metadata.decisionType`: `approval-response`, `variable-check`, `threshold` |
| Subprocess         | `stepType: "subprocess"` with `action.processId` referencing child          |
| Registration order | Leaf processes first, then parents                                          |
| Source link        | `metadata.sourceDoc` on the process record                                  |
| Batch size         | Create steps in parallel batches of 4-5                                     |
| Verification       | Count steps, verify chain, verify subprocesses                              |

---

_Created: 2026-03-28_
