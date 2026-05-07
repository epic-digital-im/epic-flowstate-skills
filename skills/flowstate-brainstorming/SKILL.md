---
name: flowstate-brainstorming
description: Use when a project or milestone needs a design spec before task execution begins, or when an entity has a brainstorm tag - runs structured brainstorming through FlowState discussions and document approval workflow. Outputs an approved design spec document.
---

# Brainstorming Process

**Status:** Active
**Purpose:** Standard operating procedure for turning a project or milestone idea into an approved design spec through structured brainstorming
**Scope:** All projects and milestones that require design work before task execution
**Trigger:** Project or milestone enters "To Do" status with a `brainstorm` tag
**Next Process:** [Multi-Phase Planning](flowstate-multi-phase-planning) (projects) or [Task Execution](flowstate-task-execution) (milestones)

---

## Overview

Brainstorming transforms a project or milestone title and description into an approved design specification. The process runs asynchronously through FlowState's document/approval workflow, not interactively in a terminal session. All questions, proposals, and decisions are captured as discussions and documents on the parent entity.

The output is an approved design spec document. Once approved, the process transitions to the task execution process for implementation.

```
Read Entity -> Context Research -> Clarifying Questions -> Approach Proposals
     (0)            (1)                 (2)                     (3)
                                                                 |
                                                                 v
Design Doc <- Revision Loop <- Design Approval <- Design Sections
   (7)            (6)              (5)                (4)
    |
    v
Transition to Task Execution (8)
```

---

## Prerequisites

Before brainstorming starts:

- A project or milestone exists in FlowState with a title and description
- The entity has a `brainstorm` tag
- The entity has `metadata.assignedAgent` set (the agent that will run the process)
- The entity's `orgId` and `workspaceId` are set

---

## Step 0: Read Config & Load Entity

**Who:** Assigned agent
**Pause:** No

### Actions

1. **Read `.flowstate/config.json` from the repository root** to obtain `orgId`, `workspaceId`, `codebaseId`:
   ```
   Read .flowstate/config.json → extract orgId, workspaceId, codebaseId
   ```
   IDs are NEVER guessed, inferred from project names, or recalled from memory. They must be read from the file.

2. Fetch the project or milestone from FlowState using the real orgId:
   ```
   collection-get <projects|milestones> <entity_id> orgId=<orgId from config>
   ```
3. Record `title`, `description` from the entity
4. Update entity status to "In Progress":
   ```
   collection-update <collection> <entity_id> { "status": "In Progress", "orgId": "<from config>" }
   ```

### Done when

- Config file read and orgId, workspaceId, codebaseId extracted
- Entity status is "In Progress"
- Agent has the entity context loaded

---

## Step 1: Context Research

**Who:** Assigned agent
**Pause:** No

### Deep Analysis Pre-Step (Optional)

If a deep-analysis synthesis document exists for this project/milestone:

1. Check for existing synthesis documents:
   ```
   document-search { query: "deep analysis", projectId: "<project_id>" }
   ```
2. If found, load the synthesis content as starting context
3. Skip redundant entity/codebase research already covered by synthesis
4. Proceed to Step 2 (Clarifying Questions) with synthesis-informed context

If no synthesis exists, proceed with standard context research below.

### Actions

1. Read existing codebase files, documentation, and architecture relevant to the entity's description
2. Check for related projects, milestones, or prior design work:
   ```
   collection-query documents { "projectId": "<project_id>" }
   collection-query discussions { "entityId": "<entity_id>" }
   ```
3. Examine relevant source code, schemas, APIs, or external services referenced in the description
4. Build a context summary of what exists today and what the entity is asking for

5. **Run codebase reality check** via `flowstate-codebase-audit` skill:
   - Run `flowstate audit . --format json` to validate config integrity
   - If audit finds errors, stop and fix before proceeding to design
   - This gate prevents design work against a codebase with stale or missing FlowState config
   - Log audit result summary in the context research discussion

### Done when

- Agent understands the current state of the codebase relevant to the entity
- Agent has identified what already exists vs. what needs to be designed
- Codebase audit passes (zero errors)

---

## Step 2: Clarifying Questions

**Who:** Assigned agent (asks), human or approver agent (answers)
**Pause:** Yes (approval per question)

This step repeats for each question that needs human input. Questions are asked one at a time.

### Actions (per question)

1. Create a discussion on the entity with the question:
   ```
   collection-create discussions {
     entityType: "<project|milestone>",
     entityId: "<entity_id>",
     content: "<question with multiple-choice options where possible>",
     userName: "<agent characterName from metadata>",
     userId: "<agent teamMemberId from metadata>",
     orgId: "<orgId>",
     workspaceId: "<workspaceId>",
     threadDepth: 0,
     isEdited: false,
     isDeleted: false
   }
   ```
2. Create an approval requesting an answer:
   ```
   collection-create approvals {
     projectId: "<project_id>",
     milestoneId: "<milestone_id>",
     title: "Brainstorm Q: <short question summary>",
     type: "brainstorm-question",
     category: "brainstorming",
     categoryName: "Brainstorming",
     status: "pending",
     documentType: "question",
     documentContent: "<full question with context and options>",
     orgId: "<orgId>"
   }
   ```
3. **Pause.** Wait for approval response.
4. On resume, read the approval's `response` and `comments` fields
5. Record the answer as a reply discussion:
   ```
   collection-create discussions {
     entityType: "<project|milestone>",
     entityId: "<entity_id>",
     parentId: "<question_discussion_id>",
     content: "Answer: <response>",
     userName: "<approver characterName>",
     userId: "<approver teamMemberId>",
     threadDepth: 1,
     ...
   }
   ```
6. If more questions needed, repeat from action 1
7. If no more questions, proceed to Step 3

### Question guidelines

- Prefer multiple-choice options with a recommended default
- One question per approval (not batched)
- Include enough context that the approver can answer without reading the full codebase
- Focus on: purpose, constraints, success criteria, technology choices, scope boundaries

### Done when

- All clarifying questions have been answered
- Answers are recorded as discussion threads on the entity

---

## Step 3: Approach Proposals

**Who:** Assigned agent (proposes), human or approver agent (selects)
**Pause:** Yes (approval)

### Actions

1. Based on context research and clarifying answers, draft 2-3 approaches with trade-offs
2. Create a document with the proposals:
   ```
   document-create:
     title: "Brainstorm: <entity title> - Approach Proposals"
     documentType: "note"
     content: <proposals markdown with pros/cons and recommendation>
     projectId: <project_id>
     milestoneId: <milestone_id>
   ```
3. Set `workspaceId` on the document via `collection-update`
4. Create an approval for approach selection:
   ```
   collection-create approvals {
     projectId: "<project_id>",
     milestoneId: "<milestone_id>",
     documentId: "<proposals_document_id>",
     title: "Select approach: <entity title>",
     type: "brainstorm-approach",
     category: "brainstorming",
     categoryName: "Brainstorming",
     status: "pending",
     documentType: "proposals",
     documentContent: "<proposals summary with options>",
     orgId: "<orgId>"
   }
   ```
5. **Pause.** Wait for approval response.
6. On resume, read the selected approach from `response`

### Proposal format

Each approach should include:

- Name (e.g., "Approach A: Monolithic Worker")
- Description (2-3 sentences)
- Pros (bullet list)
- Cons (bullet list)
- Recommendation with reasoning (lead with the recommended option)

### Done when

- 2-3 approaches proposed as a FlowState document
- Approval resolved with selected approach
- Selected approach recorded

---

## Step 4: Design Sections

**Who:** Assigned agent (writes), human or approver agent (reviews per section)
**Pause:** Yes (approval per section)

Present the design section by section. Each section gets its own approval cycle. Scale each section to its complexity: a few sentences for straightforward parts, detailed treatment for nuanced areas.

### Sections (adapt to the project)

Typical sections for a technical design:

1. Storage / Data Model
2. API Surface / Route Structure
3. Authentication & Middleware
4. Async Processing / Background Work
5. Schema / Database Design
6. Project Structure & Configuration
7. Key Behavioral Details

### Actions (per section)

1. Write the section content
2. Create a discussion on the entity with the section:
   ```
   collection-create discussions {
     entityType: "<project|milestone>",
     entityId: "<entity_id>",
     content: "## Design Section: <section name>\n\n<section content>\n\nDoes this look right?",
     userName: "<agent characterName from metadata>",
     userId: "<agent teamMemberId from metadata>",
     ...
   }
   ```
3. Create an approval for the section:
   ```
   collection-create approvals {
     projectId: "<project_id>",
     title: "Design section: <section name>",
     type: "brainstorm-design-section",
     category: "brainstorming",
     categoryName: "Brainstorming",
     status: "pending",
     documentContent: "<section content>",
     orgId: "<orgId>"
   }
   ```
4. **Pause.** Wait for approval.
5. On resume:
   - If `response` is "approved": proceed to next section
   - If `response` is "needs-revision": read `comments`, revise section, create new approval (repeat)
   - If `response` is "rejected": discard section, discuss alternative via Step 2 pattern

### Done when

- All design sections approved
- Section content accumulated for the full design document

---

## Step 5: Design Approval

**Who:** Assigned agent (assembles), human or approver agent (approves)
**Pause:** Yes (approval)

### Actions

1. Assemble all approved sections into a complete design summary
2. Create a discussion with the full design overview:
   ```
   collection-create discussions {
     entityType: "<project|milestone>",
     entityId: "<entity_id>",
     content: "## Complete Design Summary\n\n<assembled design>\n\nReady to write the formal spec document?",
     ...
   }
   ```
3. Create an approval for the complete design:
   ```
   collection-create approvals {
     projectId: "<project_id>",
     title: "Approve design: <entity title>",
     type: "brainstorm-design-approval",
     category: "brainstorming",
     categoryName: "Brainstorming",
     status: "pending",
     documentContent: "<complete design summary>",
     orgId: "<orgId>"
   }
   ```
4. **Pause.** Wait for approval.
5. On resume:
   - If approved: proceed to Step 6
   - If needs-revision: return to Step 4 for specific sections flagged in `comments`

### Done when

- Complete design is approved as a whole

---

## Step 6: Revision Loop

**Who:** Assigned agent
**Pause:** Only if revisions trigger new approvals

This step handles revisions requested during Step 5. If the design was approved without revision, this step is skipped.

### Actions

1. Read revision feedback from the approval `comments`
2. Identify which sections need changes
3. Revise sections (follows Step 4 pattern with per-section approvals)
4. Re-submit complete design for approval (returns to Step 5)

### Done when

- All revisions addressed
- Design re-approved

---

## Step 7: Write Design Document

**Who:** Assigned agent
**Pause:** Yes (final approval)

### Actions

1. Write the formal design spec to the filesystem:

   ```
   docs/specs/YYYY-MM-DD-<topic>-design.md
   ```

2. Perform spec self-review before submitting:
   - **Placeholder scan:** No TBDs, TODOs, or incomplete sections
   - **Internal consistency:** Architecture matches feature descriptions, types match configs
   - **Scope check:** Focused enough for a single implementation plan or clearly decomposed
   - **Ambiguity check:** No requirements that could be interpreted two ways
   - Fix any issues inline

3. Create a FlowState document (follows [Document Creation Process](document-creation-process.md)):
   ```
   document-create:
     title: "<Entity Title> Design Spec"
     documentType: "spec"
     content: <spec file content>
     projectId: <project_id>
     milestoneId: <milestone_id>
   ```
4. Set `workspaceId` and `metadata.localPath` via `collection-update`
5. Add FlowState reference block to the spec file header
6. Commit the spec file to git

7. Create final approval for the written spec:
   ```
   collection-create approvals {
     projectId: "<project_id>",
     documentId: "<spec_document_id>",
     title: "Final spec review: <entity title>",
     type: "brainstorm-spec-review",
     category: "brainstorming",
     categoryName: "Brainstorming",
     status: "pending",
     documentContent: "<spec content or summary>",
     orgId: "<orgId>"
   }
   ```
8. **Pause.** Wait for approval.
9. On resume:
   - If approved: proceed to Step 8
   - If needs-revision: update spec file, recommit, create new approval (repeat)

### Done when

- Spec file exists at `docs/specs/YYYY-MM-DD-<topic>-design.md`
- FlowState document created with bidirectional linkage
- Spec committed to git
- Final approval granted

---

## Step 8: Transition to Next Process

**Who:** Assigned agent
**Pause:** No

### Actions

1. Update the entity description to reference the approved spec:

   ```
   collection-update <collection> <entity_id> {
     "description": "<existing description>\n\n**Design Spec:** docs/specs/YYYY-MM-DD-<topic>-design.md\n**Spec Document:** docu_XXXXX"
   }
   ```

2. Remove the `brainstorm` tag from the entity (brainstorming is complete)

3. **Branch based on entity type:**

   **If the entity is a project:**
   - Transition to `flowstate-multi-phase-planning`
   - The design spec becomes the input for phase decomposition
   - Multi-phase planning will create milestones with phase plan documents
   - Do NOT create milestones or tasks directly -- that is the planning process's job

   **If the entity is a milestone:**
   - Create tasks directly from the spec's task breakdown section
     ```
     collection-create tasks { ... }
     ```
   - Set the first task to "Planned" status
   - Transition to `flowstate-task-execution` for the first task

### Done when

- Entity description references the approved spec
- `brainstorm` tag removed
- **Project path:** Ready for `flowstate-multi-phase-planning`
- **Milestone path:** Tasks created, first task ready for `flowstate-task-execution`

---

## FlowState Entity Map

All artifacts are created as FlowState entities linked to the parent project/milestone:

| Step | Entity Type | Collection    | Purpose                          |
| ---- | ----------- | ------------- | -------------------------------- |
| 2    | Discussion  | `discussions` | Clarifying questions and answers |
| 2    | Approval    | `approvals`   | Question response gate           |
| 3    | Document    | `documents`   | Approach proposals               |
| 3    | Approval    | `approvals`   | Approach selection gate          |
| 4    | Discussion  | `discussions` | Design section presentations     |
| 4    | Approval    | `approvals`   | Per-section approval gate        |
| 5    | Discussion  | `discussions` | Complete design summary          |
| 5    | Approval    | `approvals`   | Full design approval gate        |
| 7    | Document    | `documents`   | Formal design spec               |
| 7    | Approval    | `approvals`   | Final spec review gate           |

---

## Approval Workflow

This process uses the standard FlowState approval workflow. See `flowstate-approval-workflow` for the full pattern (creating approvals, response routing, pause/resume, revision loops).

### Brainstorming Approval Types

| Type                         | Category        | When Used                                |
| ---------------------------- | --------------- | ---------------------------------------- |
| `brainstorm-question`        | `brainstorming` | Clarifying questions needing human input |
| `brainstorm-approach`        | `brainstorming` | Selecting between proposed approaches    |
| `brainstorm-design-section`  | `brainstorming` | Per-section design review                |
| `brainstorm-design-approval` | `brainstorming` | Complete design approval                 |
| `brainstorm-spec-review`     | `brainstorming` | Final written spec review                |

---

## Process Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         BRAINSTORMING PROCESS                            │
│                                                                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐            │
│  │ 0: Read  │──>│ 1: Context│──>│ 2: Ask   │──>│ 3: Propose│            │
│  │ Entity   │   │ Research │   │ Questions│   │ Approaches│            │
│  └──────────┘   └──────────┘   └────┬─────┘   └─────┬─────┘            │
│                                      │  ^            │                   │
│                                      │  │ (more Qs)  │                   │
│                                      └──┘            │                   │
│                                                      v                   │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐            │
│  │ 7: Write │<──│ 6: Revise│<──│ 5: Design│<──│ 4: Design│            │
│  │ Spec Doc │   │ (if needed)  │ Approval │   │ Sections │            │
│  └──────────┘   └──────────┘   └──────────┘   └────┬─────┘            │
│       │                                             │  ^                │
│       │                                             │  │ (per section)  │
│       │                                             └──┘                │
│       v                                                                  │
│  ┌──────────────────┐                                                    │
│  │ 8: Transition to │──> (project) Multi-Phase Planning                  │
│  │ Next Process     │──> (milestone) Task Execution                      │
│  └──────────────────┘                                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

| Situation                                        | Action                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| Approval times out (no response in 72h)          | Create a reminder discussion, re-send approval                            |
| Context research finds conflicting prior designs | Flag in a discussion, ask for clarification in Step 2                     |
| All approaches rejected                          | Return to Step 1 with broader context research                            |
| Spec too large for single implementation         | Decompose into sub-projects in Step 8, each gets its own brainstorm cycle |
| Entity missing orgId/workspaceId                 | Fetch from parent entity or config before proceeding                      |

---

## Conventions

| Item                  | Convention                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| Spec file path        | `docs/specs/YYYY-MM-DD-<topic>-design.md`                                                       |
| Discussion format     | Markdown with clear headers and options                                                         |
| Approval title prefix | `Brainstorm Q:`, `Select approach:`, `Design section:`, `Approve design:`, `Final spec review:` |
| Approval category     | `brainstorming`                                                                                 |
| Entity tag            | `brainstorm` (removed on completion)                                                            |
| Document linkage      | Follows [Document Creation Process](document-creation-process.md)                               |

---

_Created: 2026-03-28_
