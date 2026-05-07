---
name: flowstate-document-creation
description: Use when creating any local file (spec, plan, review, doc) that needs a corresponding FlowState document record, or when a FlowState document needs a reference block prepended to its local file - enforces bidirectional linkage between filesystem files and FlowState documents collection.
---

# Document Creation Process

**Status:** Active
**Purpose:** Standard operating procedure for creating FlowState documents and attaching them to projects, milestones, and tasks
**Scope:** All document artifacts produced during task execution in the flowstate-platform monorepo

---

## Overview

Documents in FlowState are stored in RxDB and optionally backed by S3 (MinIO) with automatic RAG indexing. Every significant artifact (specs, plans, code reviews, notes) should be created as a FlowState document and linked to its parent entity.

The pipeline: **MCP tool -> RxDB -> Document Store (S3) -> RAG Sync -> Ollama embeddings -> SurrealDB vectors**

---

## Mandatory Rule: Bidirectional Linkage

**Every local file created in the filesystem MUST have a corresponding FlowState document. Every FlowState document backed by a local file MUST reference it. No exceptions.**

### Local file -> FlowState

Every local document file (specs, plans, process docs, steering docs) must have a corresponding FlowState document created via `document-create`. The FlowState document's metadata must include the local file path relative to the codebase root:

```json
{
  "metadata": {
    "localPath": "docs/plans/2026-03-28-phase1-api-core.md"
  }
}
```

### FlowState -> Local file

Every local file that has a FlowState document must include a reference block at the top of the file, immediately after the title:

```markdown
# Document Title

> **FlowState Document:** `docu_XXXXX`
> **Project:** `proj_XXXXX` | **Milestone:** `mile_XXXXX`
> **Local Path:** `docs/plans/2026-03-28-phase1-api-core.md`
```

This block goes after the `#` title and before any other content. For files that already have content, insert the block between the title and the first `---` or section.

### Why this matters

- FlowState documents appear in the UI's Documents tab for project/milestone/task views
- The `localPath` metadata lets agents and the UI locate the source file on disk
- The reference block in local files lets anyone reading the file find the FlowState record
- RAG indexing makes the content searchable via semantic search
- Without both links, documents become orphaned in one system or the other

---

## When to Create Documents

| Trigger                     | Document Type | Attach To           |
| --------------------------- | ------------- | ------------------- |
| Design spec written         | `spec`        | Project + Milestone |
| Implementation plan created | `plan`        | Project + Milestone |
| Code review completed       | `note`        | Task                |
| Architecture decision       | `steering`    | Project             |
| Process documentation       | `markdown`    | Project             |
| Generated code artifacts    | `code`        | Task                |
| General notes or findings   | `note`        | Milestone or Task   |

---

## Prerequisites

Before creating a document:

1. **Know the parent entity IDs.** Fetch the parent entity first to get correct `orgId` and `workspaceId`:

   ```
   collection-get <collection> <entity_id>
   ```

2. **Never guess context IDs.** All of these must come from an existing entity, not placeholders:
   - `orgId` (required)
   - `workspaceId` (required for UI visibility)
   - `projectId` (if scoped to a project)
   - `milestoneId` (if scoped to a milestone)
   - `taskId` (if scoped to a task)

3. **Verify the document pipeline is online** (first time only):
   ```bash
   docker ps --format '{{.Names}}' | grep -E 'document-store|minio|rag-sync'
   ```

---

## Step 1: Gather Context IDs

Fetch the parent entity to get the correct org and workspace:

```
collection-get tasks <task_id>
# or
collection-get milestones <milestone_id>
# or
collection-get projects <project_id>
```

Record these values from the response:

| Field         | Example           |
| ------------- | ----------------- |
| `orgId`       | `org_9f3omFEY2H`  |
| `workspaceId` | `work_5IG0yrojOg` |
| `projectId`   | `proj_q5wJoHYUr1` |
| `milestoneId` | `mile_NPWTq67Xe3` |
| `taskId`      | `task_DlmMU0boSt` |

---

## Step 2: Create the Document via MCP

Use the `document-create` MCP tool. **If the document has a local file, read the file content and pass it as `content`.**

```
mcp__epic-flowstate__document-create({
  orgId: "<orgId>",
  title: "<descriptive title>",
  content: "<full markdown content>",
  documentType: "<spec|plan|steering|note|markdown|code|other>",
  projectId: "<projectId>",
  milestoneId: "<milestoneId>",
  taskId: "<taskId>",         // optional, only if task-scoped
  storeInS3: true             // default, enables RAG indexing
})
```

**Record the returned `documentId` (e.g., `docu_XXXXX`).** You need it for Steps 3 and 4.

### Document type reference

| Type       | Use for                                       |
| ---------- | --------------------------------------------- |
| `spec`     | Design specifications, requirements documents |
| `plan`     | Implementation plans, execution plans         |
| `steering` | Architecture decisions, strategic documents   |
| `note`     | Code reviews, meeting notes, findings         |
| `markdown` | General documentation, process docs           |
| `code`     | Generated code, snippets, examples            |
| `other`    | Anything that doesn't fit the above           |

### Content source

For documents backed by files in the repo (specs, plans), read the file content and pass it as the `content` parameter:

```
# Read the file first
Read docs/specs/2026-03-26-design.md

# Then pass the file content to document-create
```

For inline documents (code reviews, notes), compose the content directly.

---

## Step 3: Set workspaceId and localPath metadata

The `document-create` MCP tool does not currently set `workspaceId` or custom metadata on the RxDB document. Two updates are required after creation.

### 3a. Fix workspaceId

The UI filters documents by workspace. Documents with an empty `workspaceId` will not appear in the Documents tab.

```
mcp__epic-flowstate__collection-update({
  collection: "documents",
  id: "<document_id>",
  orgId: "<orgId>",
  data: { "workspaceId": "<workspaceId>" }
})
```

**Required until the MCP document-create tool is patched to accept and persist `workspaceId`.**

### 3b. Set localPath metadata (for file-backed documents)

If the document has a corresponding local file, set the `localPath` in metadata. The path must be relative to the codebase root.

```
mcp__epic-flowstate__collection-update({
  collection: "documents",
  id: "<document_id>",
  orgId: "<orgId>",
  data: {
    "metadata": {
      "localPath": "<relative/path/to/file.md>"
    }
  }
})
```

Examples of valid `localPath` values:

| File                | localPath                                           |
| ------------------- | --------------------------------------------------- |
| Implementation plan | `docs/plans/2026-03-28-phase1-api-core.md`          |
| Design spec         | `docs/specs/2026-03-26-platform-api-design.md`      |
| Process doc         | `.flowstate/docs/process/task-execution-process.md` |
| Business plan       | `.flowstate/cloud/plan/00-executive-summary.md`     |
| MVP spec            | `.flowstate/cloud/mvp/mvp1.md`                      |

### 3c. Add FlowState reference to local file

Insert a reference block at the top of the local file, after the `#` title line:

```markdown
> **FlowState Document:** `docu_XXXXX`
> **Project:** `proj_XXXXX` | **Milestone:** `mile_XXXXX`
> **Local Path:** `<relative/path/to/file.md>`
```

For a plan file, the result looks like:

```markdown
# Phase 1: API Core Implementation Plan

> **FlowState Document:** `docu_VQYdb1_2eI`
> **Project:** `proj_q5wJoHYUr1` | **Milestone:** `mile_NPWTq67Xe3`
> **Local Path:** `docs/plans/2026-03-28-phase1-api-core.md`

**Goal:** Build the shared API infrastructure package...
```

**This step is not optional.** If a local file exists without a FlowState reference block, or a FlowState document exists without `metadata.localPath`, the linkage is broken.

---

## Step 4: Verify the Document

### Verify in RxDB

```
mcp__epic-flowstate__document-get({
  orgId: "<orgId>",
  documentId: "<document_id>",
  includeContent: false
})
```

Confirm all fields are set:

- `orgId` matches the parent entity
- `workspaceId` is not empty
- `projectId`, `milestoneId`, `taskId` are correctly linked
- `storage.s3Key` exists (if S3-backed)
- `storage.documentStoreId` exists
- `metadata.localPath` is set (for file-backed documents)

### Verify bidirectional linkage

For file-backed documents, confirm both directions:

1. **FlowState -> file:** `metadata.localPath` contains the correct relative path
2. **File -> FlowState:** The local file contains the `> **FlowState Document:** docu_XXXXX` reference block

### Verify in S3 pipeline

The document-create response includes a `ragJobId`. The RAG sync pipeline automatically:

1. Downloads the document from S3
2. Chunks the content
3. Generates embeddings via Ollama
4. Stores vectors in SurrealDB

No manual action is required. To verify RAG indexing:

```
mcp__epic-flowstate__rag-search({
  query: "<keywords from the document>",
  limit: 3
})
```

### Verify in UI

Navigate to the entity's Documents tab:

- **Project:** `http://localhost:4000/apps/projects/projects/<projectId>` -> Documents tab
- **Milestone:** `http://localhost:4000/apps/projects/projects/<projectId>/milestones/<milestoneId>` -> Documents tab
- **Task:** `http://localhost:4000/apps/projects/projects/<projectId>/milestones/<milestoneId>/tasks/<taskId>` -> Documents tab

The document count badge should reflect the new document.

---

## Scoping Rules

Documents follow a hierarchy. A document can be scoped at multiple levels simultaneously:

```
Project (broadest)
  └── Milestone
        └── Task (most specific)
```

- Setting only `projectId`: document appears on the project's Documents tab
- Setting `projectId` + `milestoneId`: appears on both project and milestone tabs
- Setting all three: appears on project, milestone, and task tabs

The UI's `DocumentsTab` component uses priority scoping: **taskId > milestoneId > projectId**. It queries the most specific scope that was provided as a prop.

---

## Linking Documents to Task Execution

Documents must be created at specific points in the task execution process. Every step that produces a local file triggers the full create-link-verify cycle.

### During Step 1 (Create Implementation Plan)

After the plan file is written to `docs/plans/`:

1. Read the plan file content
2. Create FlowState document:
   ```
   document-create:
     title: "Phase N: <task title> Implementation Plan"
     documentType: "plan"
     content: <plan file content>
     projectId: <from parent task>
     milestoneId: <from parent task>
   ```
3. Set `workspaceId` and `metadata.localPath` (Step 3a + 3b)
4. Add FlowState reference block to the plan file header (Step 3c)
5. Commit the updated plan file

### During Step 6 (Code Review)

After code review completes (no local file, inline content only):

```
document-create:
  title: "Code Review: <task title>"
  documentType: "note"
  content: <review findings markdown>
  projectId: <from parent task>
  milestoneId: <from parent task>
  taskId: <parent task id>
```

No `localPath` needed since code review content is inline. Set `workspaceId` only.

### At project/milestone creation

When a design spec or steering document is finalized:

1. Read the spec file content
2. Create FlowState document:
   ```
   document-create:
     title: "<Design Spec Title>"
     documentType: "spec"
     content: <spec file content>
     projectId: <project id>
     milestoneId: <milestone id, if applicable>
   ```
3. Set `workspaceId` and `metadata.localPath` (Step 3a + 3b)
4. Add FlowState reference block to the spec file header (Step 3c)
5. Commit the updated spec file

### Business plan and product setup documents

When running the product-setup-process, each plan document (`00-executive-summary.md` through `08-goals-milestones.md`) and each MVP spec must have a FlowState document created. See `product-setup-process.md` Step 2a for details.

---

## Error Handling

| Situation                         | Action                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `orgId not configured`            | Pass `orgId` explicitly in the MCP call                                                              |
| `S3 Access Key Id does not exist` | Recreate document-store container: `docker compose -f docker-compose.local.yml up -d document-store` |
| Document not visible in UI        | Check `workspaceId` is set (Step 3). Empty `workspaceId` causes UI filter mismatch                   |
| RAG indexing fails                | Check rag-sync container logs: `docker logs flowstate-rag-sync --tail 50`                            |
| Content too large                 | S3-backed documents handle large content. Ensure `storeInS3: true`                                   |

---

## Quick Reference

```
# 1. Get parent entity context
collection-get milestones <milestone_id>

# 2. Create FlowState document
document-create:
  orgId, title, content, documentType,
  projectId, milestoneId, taskId (optional),
  storeInS3: true

# 3a. Fix workspaceId
collection-update documents <doc_id> { workspaceId: "<workspace_id>" }

# 3b. Set localPath metadata (file-backed docs only)
collection-update documents <doc_id> { metadata: { localPath: "<relative/path>" } }

# 3c. Add reference block to local file (file-backed docs only)
# Insert after title: > **FlowState Document:** `docu_XXXXX`

# 4. Verify
document-get <doc_id> includeContent: false
# Check: workspaceId set, metadata.localPath set, local file has reference block
```

---

_Created: 2026-03-28_
