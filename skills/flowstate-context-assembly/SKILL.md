---
name: flowstate-context-assembly
description: Use when any skill needs rich context from FlowState entities, RAG search, and filesystem — reusable sub-skill that collects sources within token budgets and outputs a context bundle JSON file.
---

# Context Assembly

**Status:** Active
**Purpose:** Collect and assemble context from all FlowState data sources within token budgets
**Scope:** Reusable sub-skill for any process needing rich cross-source context
**Trigger:** Called by `flowstate-deep-analysis` or any skill needing rich context
**Input:** Source list + token budget + scope (entity IDs, codebase IDs) + analysis question
**Output:** Context bundle JSON file path

---

## Overview

Context Assembly is a reusable sub-skill that handles the mechanics of collecting content from FlowState's heterogeneous data sources — entities, RAG-indexed code, documents, filesystem artifacts, business plans, and agent memory — within a configurable token budget. It outputs a structured JSON bundle file that any downstream consumer (analysis scripts, skills, agents) can read.

Each source type has a dedicated collector. Collectors run in priority order, consuming their allocated budget. If a collector returns fewer tokens than allocated, the surplus is redistributed to lower-priority collectors.

```
Initialize Budget -> Run Collectors -> Apply Summaries -> Assemble Bundle
       (0)               (1)               (2)                (3)
```

---

## Prerequisites

Before calling:

- `.flowstate/config.json` exists with `orgId`, `workspaceId`, `codebaseId`
- Caller provides: source list with priorities, token budget config, scope (entity IDs)
- FlowState MCP tools are available and authenticated
- RAG sync has been run for code/markdown context (if RAG sources are requested)

---

## Step 0: Initialize Budget

**Who:** Calling agent
**Pause:** No

### Actions

1. Create a `TokenBudgetManager` with the provided budget config:
   - Total budget (e.g., 900,000 tokens)
   - Per-source allocations (percentage or absolute)
   - Priority ordering for surplus redistribution

2. Allocate tokens across source types based on the caller's profile:

   | Source Type  | Default Allocation | Priority |
   | ------------ | ------------------ | -------- |
   | entities     | 30%                | 1        |
   | rag          | 25%                | 2        |
   | documents    | 20%                | 3        |
   | filesystem   | 15%                | 4        |
   | bizplan      | 5%                 | 5        |
   | memory       | 5%                 | 6        |

3. Create the output directory if needed:
   ```
   mkdir -p .flowstate/analysis/bundles
   ```

### Done when

- Budget manager initialized with allocations
- Source priorities established
- Output directory exists

---

## Step 1: Run Collectors

**Who:** Calling agent
**Pause:** No

Run collectors in priority order. Each collector queries FlowState MCP tools and returns `ContentBlock[]` arrays within its allocated budget. If a collector returns fewer tokens than allocated, redistribute surplus to the next collector.

### Entity Collector

Collects FlowState entity data: tasks, milestones, features, gap items, assignments, discussions.

**MCP tools used:**
- `collection-query tasks { "projectId": "<id>", "orgId": "<orgId>" }`
- `collection-query milestones { "projectId": "<id>", "orgId": "<orgId>" }`
- `collection-query discussions { "entityId": "<id>", "orgId": "<orgId>" }`

**Content blocks produced:**
- Task summaries (title, status, description, assignee)
- Milestone status and progress
- Discussion threads (questions, decisions, context)
- Feature matrices and gap items

### RAG Collector

Collects code and markdown content from RAG-indexed repositories.

**MCP tools used:**
- `rag-search { query: "<analysis question>", limit: 50 }`
- `rag-context { query: "<specific topic>", codebaseId: "<id>" }`
- `codebase-search { query: "<pattern>", codebaseId: "<id>" }`

**Content blocks produced:**
- Code snippets with file paths and relevance scores
- Markdown documentation sections
- Architecture and design documents from indexed repos

### Document Collector

Collects FlowState documents (specs, plans, notes, reviews).

**MCP tools used:**
- `document-search { query: "<topic>", projectId: "<id>" }`
- `document-get <document_id>`

**Content blocks produced:**
- Design specs and their key sections
- Implementation plans
- Prior analysis documents and synthesis outputs

### Filesystem Collector

Collects local architecture docs, specs, READMEs, and configuration files.

**Actions:**
- Scan `docs/` for architecture and spec files
- Read `README.md` and `CLAUDE.md` for project context
- Read `.flowstate/config.json` for entity relationships
- Read `package.json` for dependency context

**Content blocks produced:**
- Architecture documentation
- Project configuration and dependencies
- Local spec files not yet synced to FlowState

### Business Plan Collector

Collects business plans and linked products.

**MCP tools used:**
- `bizplan-get <bizplan_id>`
- `product-get <product_id>`
- `bizplan-list { orgId: "<orgId>" }`
- `product-list { orgId: "<orgId>" }`

**Content blocks produced:**
- Business plan goals, competitors, financials
- Product roadmaps and initiatives
- Team structure and responsibilities

### Memory Collector

Collects agent session memory for continuity.

**MCP tools used:**
- `agent-memory-recall { query: "<analysis topic>" }`
- `agent-memory-search { query: "<relevant context>" }`

**Content blocks produced:**
- Prior session context and decisions
- Recurring patterns and known issues

### Done when

- All collectors have run within their budgets
- Content blocks collected from each available source
- Surplus tokens redistributed across collectors

---

## Step 2: Apply Summary Strategies

**Who:** Calling agent
**Pause:** No

For content blocks that exceed their allocation or are marked with a summary strategy (from the caller's role profile), apply compression:

### Summary Strategies

| Strategy         | Behavior                                              | Use Case                         |
| ---------------- | ----------------------------------------------------- | -------------------------------- |
| `full`           | Include complete content (default)                    | High-priority sources            |
| `executive`      | Extract key decisions, risks, recommendations         | Business plans for technical ICs |
| `metrics-only`   | Extract quantitative data points                      | Financial data for dev context   |
| `titles-only`    | Return titles as bullet list                          | Low-priority entity overviews    |
| `objectives-only`| Extract goals and success criteria                    | Product context for task work    |

### Actions

1. For each content block with a summary strategy other than `full`:
   - Apply the strategy to compress the content
   - Preserve source attribution and metadata
   - Record the original token count and compressed count

2. If total tokens still exceed budget after summaries:
   - Apply `trimBlocksToFit` to remove lowest-priority blocks
   - Log which blocks were trimmed

### Done when

- All blocks are within budget
- Summary strategies applied where specified
- Total token count validated against budget

---

## Step 3: Assemble Bundle

**Who:** Calling agent
**Pause:** No

### Actions

1. Combine all `ContentBlock[]` arrays into a single ordered list:
   - Sort by source priority (highest first)
   - Within each source, sort by relevance score

2. Build the `ContextBundle` JSON structure:
   ```json
   {
     "objective": "<analysis question>",
     "scope": { "orgId": "...", "workspaceId": "...", "projectId": "...", "codebaseId": "..." },
     "blocks": [ ... ],
     "prompts": { "system": "...", "user": "...", "synthesis": "..." },
     "providers": ["anthropic", "openai", "google"],
     "tokenEstimate": { "total": 0, "bySource": { ... } },
     "metadata": { "createdAt": "...", "profile": "...", "sourceCount": 0 }
   }
   ```

3. Write the bundle to:
   ```
   .flowstate/analysis/bundles/<slug>-<timestamp>.json
   ```
   Where `<slug>` is a kebab-case summary of the analysis question.

4. Return the file path to the caller.

### Done when

- Bundle JSON file written to disk
- File path returned to calling skill
- Token estimate recorded in bundle metadata

---

## Usage by Other Skills

Any skill can call `flowstate-context-assembly` for rich context loading:

### From `flowstate-brainstorming`

```
Invoke flowstate-context-assembly with:
  sources: [entities, documents, filesystem, rag]
  budget: 200,000 tokens
  scope: { projectId: "<id>" }
  question: "<brainstorming topic>"
```

### From `flowstate-code-review`

```
Invoke flowstate-context-assembly with:
  sources: [rag, filesystem, entities]
  budget: 100,000 tokens
  scope: { codebaseId: "<id>" }
  question: "architecture and patterns for code review context"
```

### From `flowstate-writing-plans`

```
Invoke flowstate-context-assembly with:
  sources: [documents, filesystem, entities]
  budget: 150,000 tokens
  scope: { projectId: "<id>", milestoneId: "<id>" }
  question: "<task description for plan context>"
```

---

## Error Handling

| Situation                        | Action                                                          |
| -------------------------------- | --------------------------------------------------------------- |
| MCP tool call fails              | Log error, skip that collector, continue with remaining sources |
| RAG search returns no results    | Check if RAG sync has been run; warn if no indexed content      |
| Token budget exceeded            | Apply `trimBlocksToFit` to remove lowest-priority blocks        |
| No sources return content        | Return empty bundle with warning; caller decides how to proceed |
| Filesystem paths don't exist     | Skip missing files, log which were unavailable                  |
| Memory recall returns nothing    | Normal for first-time analysis; continue without memory context |

---

## Conventions

| Item              | Convention                                                  |
| ----------------- | ----------------------------------------------------------- |
| Bundle format     | JSON with `ContextBundle` schema                            |
| Bundle path       | `.flowstate/analysis/bundles/<slug>-<timestamp>.json`       |
| Token estimation  | ~4 characters per token (rough estimate for budget checks)  |
| Priority order    | entities > rag > documents > filesystem > bizplan > memory  |
| Default budget    | 900,000 tokens (configurable by caller)                     |
| Surplus handling  | Redistributed to next-priority collector                    |

---

## Integration

**Called by:**

- `flowstate-deep-analysis` (Step 2) — primary consumer
- `flowstate-brainstorming` (optional) — context enrichment
- `flowstate-code-review` (optional) — review context
- `flowstate-writing-plans` (optional) — plan context
- Any skill needing cross-source context

**Produces:**

- Context bundle JSON file consumed by `deep-analyze.ts` or directly by skills

---

_Created: 2026-04-13_
