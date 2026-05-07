---
name: flowstate-process-execution
description: Use when executing a registered FlowState process from a Claude Code session using MCP tools - loads process and step records from DB, walks the nextStepId chain, handles decision routing, approval pauses, and agent-task steps. Requires process to be registered in FlowState first.
---

# Process Execution via MCP Tools

**Status:** Active
**Purpose:** Steering instructions for executing FlowState processes using MCP tools from Claude Code sessions
**Scope:** All FlowState processes defined in the `processes` and `processsteps` collections
**Prerequisite:** Process and steps exist in FlowState (see individual process docs for definitions)

---

## Overview

FlowState processes are stored as `processes` and `processsteps` records in the database. This document tells a Claude Code agent how to load a process, walk through its steps, manage state, handle approvals, and track progress using MCP tools.

The agent reads the process definition from FlowState, executes each step in order following the `nextStepId` chain, and uses the step's `action`, `inputs`, and `outputs` fields to determine what to do. Decision steps route the flow based on variables. Human-task steps pause for approval. Agent-task steps run codebase work. Action steps call MCP tools.

```
Load Process -> Load Steps -> Execute Step -> Route Next -> Repeat -> End
```

---

## Prerequisites

Before executing any process:

1. **Know the process ID.** Either provided directly or discovered via query:

   ```
   collection-query processes { "name": "<process_name>" }
   ```

2. **Know the entity context.** The process runs against an entity (project, milestone, or task). You need:
   - `entityId` (the FlowState entity being processed)
   - `entityCollection` (`projects`, `milestones`, or `tasks`)
   - `orgId` and `workspaceId` (from the entity or `.flowstate/config.json`)

3. **MCP tools available.** The following MCP tools are used throughout:

   | Tool                | Purpose                     |
   | ------------------- | --------------------------- |
   | `collection-get`    | Fetch a single entity by ID |
   | `collection-query`  | Query entities by selector  |
   | `collection-create` | Create new entities         |
   | `collection-update` | Update existing entities    |
   | `document-create`   | Create FlowState documents  |
   | `document-get`      | Fetch document details      |

---

## Step 1: Load the Process

Fetch the process definition:

```
collection-get processes <process_id>
```

Record from the response:

| Field                | What it tells you                         |
| -------------------- | ----------------------------------------- |
| `name`               | Process identifier                        |
| `title`              | Human-readable name                       |
| `description`        | What this process does                    |
| `metadata.stepIds`   | Ordered list of all step IDs (if present) |
| `metadata.variables` | Initial variable definitions (if present) |

---

## Step 2: Load All Steps

Fetch all steps for this process, sorted by order:

```
collection-query processsteps {
  "processId": "<process_id>"
}
sort: [{ "order": "asc" }]
limit: 50
```

Build a step map in memory: `stepId -> step record`. You will use this to navigate the flow without repeated queries.

### Step record structure

Every step has these fields:

| Field         | Type    | Purpose                                                                       |
| ------------- | ------- | ----------------------------------------------------------------------------- |
| `id`          | string  | Unique step identifier                                                        |
| `name`        | string  | Machine name                                                                  |
| `title`       | string  | Human title                                                                   |
| `description` | string  | What this step does                                                           |
| `stepType`    | string  | `start`, `end`, `action`, `agent-task`, `human-task`, `decision`              |
| `order`       | integer | Execution sequence number                                                     |
| `nextStepId`  | string  | Default next step (used when no condition matches)                            |
| `action`      | object  | What to execute (MCP tool call, agent prompt, approval wait)                  |
| `inputs`      | object  | Variable mappings for this step's parameters                                  |
| `outputs`     | object  | Where to store this step's results                                            |
| `conditions`  | object  | Routing conditions (empty object; actual conditions in `metadata.conditions`) |
| `metadata`    | object  | Extended data including `conditions` array for decision steps                 |

---

## Step 3: Initialize Execution State

Create an in-memory variable store. Populate it with the entity context and any initial values:

```
variables = {
  processId: "<process_id>",
  entityId: "<entity_id>",
  entityType: "<project|milestone|task>",
  entityCollection: "<projects|milestones|tasks>",
  orgId: "<orgId>",
  workspaceId: "<workspaceId>",
  agentName: "claude-code",
  currentStepId: null,
  stepResults: {}
}
```

### Variable resolution

Steps reference variables in their `action`, `inputs`, and `outputs` fields using `{{variableName}}` template syntax. Before executing a step's action:

1. Read the step's `inputs` field
2. For each input, resolve the value:
   - `source: "variable"` -> look up in the variables store
   - `source: "previous"` -> look up in the previous step's outputs
   - `source: "result"` -> populated after the step executes
3. Substitute `{{variableName}}` placeholders in the action params with resolved values

### Output capture

After a step executes, read its `outputs` field and store each named output in the variables store:

- `source: "result"` with `jsonPath` -> extract from the MCP tool response
- `source: "stdout"` -> capture from agent task output

---

## Step 4: Execute Steps

Find the `start` step (stepType: `start`) and begin execution. For each step:

### 4a. Start step

The entry point. No action to execute. Read `nextStepId` and proceed.

```
currentStepId = startStep.nextStepId
```

### 4b. Action step (`stepType: "action"`)

Action steps call MCP tools. Read the `action` field to determine the tool and parameters.

**MCP tool actions** (`action.type: "mcp-tool"`):

1. Read `action.tool` or `action.mcpTool` for the tool name
2. Read `action.params` or `action.mcpParams` for parameters
3. Resolve all `{{variable}}` placeholders from the variable store
4. Call the MCP tool:
   ```
   mcp__epic-flowstate__<tool>({
     collection: "<resolved collection>",
     data: { <resolved params> },
     orgId: "<orgId>"
   })
   ```
5. Capture outputs per the step's `outputs` field
6. Proceed to `nextStepId`

**Example:** A step that creates a discussion:

```
Step: step_bd_post_questions
  action.type: "mcp-tool"
  action.tool: "collection-create"
  action.params.collection: "discussions"
  action.params.data: {
    entityType: "{{entityType}}",
    entityId: "{{entityId}}",
    content: "{{questionContent}}",
    ...
  }

Execution:
  1. Resolve {{entityType}} -> "milestone"
  2. Resolve {{entityId}} -> "mile_NPWTq67Xe3"
  3. Resolve {{questionContent}} -> "What storage backend...?"
  4. Call collection-create with resolved data
  5. Store result.id as "questionDiscussionId"
```

### 4c. Agent-task step (`stepType: "agent-task"`)

Agent tasks require Claude Code to do codebase work: reading files, writing code, exploring context, generating content.

1. Read `action.prompt` for the task instruction
2. Resolve any `{{variable}}` placeholders in the prompt
3. Execute the work described in the prompt (read files, write content, search codebase)
4. Capture outputs per the step's `outputs` field
5. Proceed to `nextStepId`

Agent tasks are where the real work happens. The step's `description` and `action.prompt` tell you what to produce. The `inputs` field tells you what context to use. The `outputs` field tells you what to capture for downstream steps.

### 4d. Human-task step (`stepType: "human-task"`)

Human tasks pause execution waiting for approval. The previous step will have created an approval record.

1. Read the approval ID from the variable store (e.g., `{{questionApprovalId}}`)
2. **Pause execution.** Inform the user that the process is waiting for approval:
   ```
   Process paused at step: <step.title>
   Waiting for approval: <approval_id>
   Approval type: <type from the creating step>
   ```
3. When resumed (user triggers continuation), fetch the approval:
   ```
   collection-get approvals <approval_id>
   ```
4. Read `response` and `comments` from the approval
5. Store in the variable store per the step's `outputs` field
6. Proceed to `nextStepId`

### 4e. Decision step (`stepType: "decision"`)

Decision steps route the flow based on variable values. They execute no action; they only determine the next step.

1. Read `metadata.conditions` (an array of condition objects)
2. Evaluate each condition against the variable store:
   ```
   condition: {
     when: "sectionResponse",      // variable name to check
     equals: "approved",           // expected value
     nextStepId: "step_bd_assemble_design"  // where to go if matched
   }
   ```
3. Some conditions have compound checks:
   ```
   condition: {
     when: "sectionResponse",
     equals: "approved",
     and: { when: "hasMoreSections", equals: true },
     nextStepId: "step_bd_gen_design_section"
   }
   ```
4. Evaluate conditions in order. First match wins.
5. If no condition matches, fall through to `nextStepId` (the default route).

### 4f. End step (`stepType: "end"`)

The terminal step. The process is complete.

1. Log completion
2. Optionally update the entity status or create a completion discussion
3. Stop execution

---

## Step 5: Handle Loops

Several patterns create loops in the step chain:

### Question loop

```
gen_questions -> check_confidence -> post_questions -> question_approval
-> wait_answer -> record_answer -> check_more_qs -> [gen_questions | gen_approaches]
```

Track a `questionRound` counter. After `check_more_qs`, if routing back to `gen_questions`, increment the round. The agent should incorporate previous answers into the next round of question generation.

### Design section loop

```
gen_design_section -> post_section -> section_approval -> wait_section
-> check_section -> [gen_design_section | assemble_design]
```

Track a `sectionIndex` counter and an `approvedSections` array. After each approved section, append the content and increment the index. After `check_section`, if more sections remain, the agent generates the next one.

### Revision loops

```
check_design -> gen_design_section  (if needs-revision)
check_spec -> write_spec            (if needs-revision)
```

When looping back for revision, the `comments` field from the approval contains the feedback. The agent should read this feedback and incorporate it into the revised output.

---

## Step 6: Context ID Resolution

Every MCP call that creates an entity requires `orgId`. Most require `workspaceId`. These come from three sources:

### Source priority

1. **Entity context** (from Step 3 initialization)
2. **`.flowstate/config.json`** (fallback for org-level defaults)
3. **Parent entity fetch** (for newly discovered entities)

### Resolution rules

| Creating                  | Get orgId/workspaceId from |
| ------------------------- | -------------------------- |
| Discussion on a project   | The project record         |
| Discussion on a milestone | The milestone record       |
| Approval for a project    | The project record         |
| Document for a milestone  | The milestone record       |
| Task under a milestone    | The milestone record       |
| Milestone under a project | The project record         |

### Config fallback

If the entity context doesn't have `orgId` or `workspaceId`, read from config:

```json
{
  "orgId": "org_9f3omFEY2H",
  "workspaceId": "work_5IG0yrojOg"
}
```

**Never use placeholder values** like `"default"`, `"system"`, or `"flowstate"` for context IDs.

---

## Step 7: Approval Management

Approvals are the primary coordination mechanism between agents and humans. See `flowstate-approval-workflow` for the complete approval pattern including field reference, response routing, pause/resume, and revision loops.

**Key rule:** Route on the `response` field, not the `status` field. Decision steps after human-task steps check `response` values (`approved`, `needs-revision`, `rejected`).

---

## Step 8: Progress Tracking

Track progress as discussions on the entity. After completing each major phase, create a progress discussion:

```
collection-create discussions {
  entityType: "<entityType>",
  entityId: "<entityId>",
  content: "## Process Progress: <process_title>\n\nCompleted: <step.title>\nNext: <nextStep.title>\nVariables captured: <count>",
  userName: "<agent characterName from metadata>",
  userId: "<agent teamMemberId from metadata>",
  orgId: "<orgId>",
  workspaceId: "<workspaceId>",
  threadDepth: 0,
  isEdited: false,
  isDeleted: false
}
```

Post progress updates at these checkpoints:

| Checkpoint         | When                                    |
| ------------------ | --------------------------------------- |
| Process started    | After Step 0 (start + entity fetch)     |
| Questions complete | After all clarifying questions answered |
| Approach selected  | After approach approval resolved        |
| Design approved    | After full design approval              |
| Spec written       | After spec file committed               |
| Process complete   | At the end step                         |

---

## Execution Patterns

### Pattern 1: Sequential execution in one session

For processes that don't require human approval pauses (or where the user is present to approve immediately):

1. Load process and steps
2. Walk the step chain from start to end
3. For human-task steps, present the content to the user and ask for their response
4. Store the response and continue

### Pattern 2: Async execution with pauses

For processes that run across multiple sessions:

1. Load process and steps
2. Execute until a human-task step
3. Create the approval and report the pause:
   ```
   Process: <process_title>
   Paused at: <step.title> (order: <step.order>)
   Waiting for: <approval_id>
   Resume by: approving the approval in FlowState UI, then running this process again
   ```
4. On resume, query for the approval response and continue from the paused step

### Pattern 3: Parallel section execution

For design section steps where sections are independent:

1. Identify all sections that need writing
2. Generate all sections (agent-task steps can run in parallel)
3. Post each section and create approvals sequentially
4. Wait for approvals one at a time

---

## Error Handling

| Situation                          | Action                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| MCP tool returns error             | Log the error, retry once. If still failing, pause and report                                             |
| Step missing from step map         | Query `processsteps` for the step ID. If not found, halt with error                                       |
| Variable not resolved              | Check inputs mapping. If source is "previous" and no previous result exists, the step chain may be broken |
| Approval not found                 | Query `approvals` by type and entity context to find it                                                   |
| Process has no start step          | Query for `stepType: "start"` in the process steps                                                        |
| Decision has no matching condition | Fall through to `nextStepId` (default route)                                                              |
| Loop runs more than 10 iterations  | Safety valve. Pause and report possible infinite loop                                                     |
| Entity missing orgId               | Fetch from `.flowstate/config.json` or parent entity                                                      |

---

## Quick Reference: MCP Tool Patterns

### Fetch entity context

```
collection-get <collection> <id>
# Returns: { document: { orgId, workspaceId, title, description, ... } }
```

### Create a discussion

```
collection-create discussions {
  entityType: "<project|milestone|task>",
  entityId: "<entity_id>",
  content: "<markdown content>",
  userName: "<agent characterName from metadata>",
  userId: "<agent teamMemberId from metadata>",
  orgId: "<orgId>",
  workspaceId: "<workspaceId>",
  threadDepth: 0,
  isEdited: false,
  isDeleted: false
}
```

### Create an approval

```
collection-create approvals {
  projectId: "<project_id>",
  milestoneId: "<milestone_id>",
  title: "<approval title>",
  type: "<process-specific-type>",
  category: "<process-category>",
  categoryName: "<Human Category Name>",
  status: "pending",
  documentContent: "<content being reviewed>",
  orgId: "<orgId>"
}
```

### Create a document

```
document-create {
  orgId: "<orgId>",
  title: "<document title>",
  content: "<markdown content>",
  documentType: "<spec|plan|note|steering|markdown>",
  projectId: "<project_id>",
  milestoneId: "<milestone_id>"
}
# Then: collection-update documents <doc_id> { workspaceId, metadata: { localPath } }
```

### Update entity status

```
collection-update <collection> <id> {
  "status": "<new status>",
  "orgId": "<orgId>"
}
```

### Query approvals by type

```
collection-query approvals {
  "type": "<approval_type>",
  "projectId": "<project_id>",
  "status": "pending"
}
```

---

## Available Processes

Query all active processes:

```
collection-query processes { "enabled": true }
```

| Process              | ID                       | Steps | Purpose                               |
| -------------------- | ------------------------ | ----- | ------------------------------------- |
| Brainstorming Design | `proc_brainstorm_design` | 32    | Turn ideas into approved design specs |

---

## Conventions

| Item              | Convention                                                                |
| ----------------- | ------------------------------------------------------------------------- |
| Variable store    | In-memory dictionary, not persisted to FlowState                          |
| Step navigation   | Follow `nextStepId` chain, decision steps override with condition matches |
| Approval pauses   | Always create discussion + approval together before pausing               |
| Progress tracking | Discussion on entity at each major checkpoint                             |
| Error recovery    | Retry once, then pause and report                                         |
| Loop safety       | Max 10 iterations per loop before halting                                 |
| Context IDs       | Always from entity or config, never placeholders                          |
| Document linkage  | Follows [Document Creation Process](document-creation-process.md)         |

---

_Created: 2026-03-28_
