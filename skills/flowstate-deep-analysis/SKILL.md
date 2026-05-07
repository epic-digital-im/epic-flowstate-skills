---
name: flowstate-deep-analysis
description: Use when performing deep project analysis across FlowState entities, RAG search results, and filesystem artifacts — orchestrates context assembly, multi-provider LLM execution, and response synthesis into a unified analysis document.
---

# Deep Analysis

**Status:** Active
**Purpose:** Assemble up to 1M tokens of context from FlowState data sources and execute structured analysis across multiple LLM providers
**Scope:** Any analysis requiring cross-cutting context from FlowState entities, RAG search, and filesystem artifacts
**Trigger:** User requests deep analysis, or as pre-cursor to brainstorming/planning
**Input:** Analysis question + scope (org/workspace/project/codebase)
**Output:** Context bundle file + synthesis document
**Chain to:** `flowstate-brainstorming` (synthesis as input), `flowstate-multi-phase-planning` (synthesis as planning context)

---

## Overview

Deep Analysis orchestrates the full pipeline for strategic, technical, or operational analysis. It reads config, determines scope, delegates context collection to `flowstate-context-assembly`, prepares prompts, executes analysis via the `deep-analyze.ts` script, and saves results as a FlowState document.

The system supports three analysis types:

- **Strategic:** Business plans, product roadmaps, competitive landscape, market positioning
- **Technical:** Architecture, code patterns, dependency analysis, performance constraints
- **Operational:** Task status, milestone progress, team assignments, delivery risks

```
Parse Request -> Resolve Role -> Assemble Context -> Prepare Prompts -> Execute -> Create Document
     (0)            (1)              (2)                  (3)            (4)           (5)
```

---

## Prerequisites

Before starting:

- `.flowstate/config.json` exists with `orgId`, `workspaceId`, `codebaseId`
- At least one LLM API key is available (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_API_KEY`)
- The `deep-analyze.ts` script is available at `packages/flowstate-cli/scripts/deep-analyze.ts`
- RAG sync has been run on relevant codebases (for code/markdown context)

---

## Step 0: Parse Analysis Request

**Who:** Assigned agent
**Pause:** No

### Actions

1. **Read `.flowstate/config.json` from the repository root** to obtain `orgId`, `workspaceId`, `codebaseId`:
   ```
   Read .flowstate/config.json -> extract orgId, workspaceId, codebaseId
   ```
   IDs are NEVER guessed, inferred from project names, or recalled from memory. They must be read from the file.

2. Parse the analysis question from the user and determine:
   - **Analysis type:** strategic, technical, or operational
   - **Scope:** org-wide, workspace-scoped, project-scoped, or codebase-scoped
   - **Relevant entity IDs:** project, milestone, product, bizplan (from user context or config)

3. If a `projectId` is needed, read the package-level config:
   ```
   Read packages/<pkg>/.flowstate/config.json -> extract projectId
   ```

4. Create the output directory:
   ```
   mkdir -p .flowstate/analysis/bundles
   mkdir -p .flowstate/analysis/outputs
   ```

### Done when

- Config file read and IDs extracted
- Analysis type, scope, and relevant entity IDs determined
- Output directories exist

---

## Step 1: Resolve Role Context Profile

**Who:** Assigned agent
**Pause:** No

### Actions

1. Check if the agent has a role assignment in the org:
   ```
   collection-query entityassignments { "entityType": "org", "entityId": "<orgId>", "orgId": "<orgId>" }
   ```

2. If a role assignment exists, resolve the `RoleContextProfile`:
   - Determine source priorities based on role (e.g., CTO sees architecture first, PM sees roadmap first)
   - Set token budget allocations per source type
   - Apply RBAC/RACI/ACL filtering rules for data access

3. If no role is assigned, use the **default Engineering IC profile**:
   - Entity sources: 30% budget
   - RAG code search: 25% budget
   - Documents: 20% budget
   - Filesystem: 15% budget
   - Business plans: 5% budget
   - Memory: 5% budget

4. Build the token budget configuration:
   - Total budget: 900,000 tokens (reserve 100K for response)
   - Allocate across source types based on profile priorities

### Done when

- Role context profile resolved (or default applied)
- Token budget configuration built with source allocations

---

## Step 2: Assemble Context

**Who:** Assigned agent (delegates to `flowstate-context-assembly`)
**Pause:** No

### Actions

1. Invoke `flowstate-context-assembly` sub-skill with:
   - Source list from role profile (with priorities and allocations)
   - Token budget configuration
   - Scope: entity IDs, codebase IDs
   - Analysis question (for relevance-weighted collection)

2. Receive back a context bundle JSON file path at:
   ```
   .flowstate/analysis/bundles/<slug>-<timestamp>.json
   ```

3. Verify the bundle was created and contains blocks from multiple source types

### Done when

- Context bundle JSON file exists
- Bundle contains content blocks within the token budget
- Multiple source types are represented in the bundle

---

## Step 3: Prepare Prompts

**Who:** Assigned agent
**Pause:** No

### Actions

1. Load prompt templates from the bundle (if included) or use defaults:
   - **System prompt:** Sets the analysis role and output format
   - **User prompt:** Contains the analysis question with assembled context
   - **Synthesis prompt:** Instructions for cross-provider response synthesis

2. Render template variables:
   - `{{question}}` — the analysis question
   - `{{scope}}` — org/workspace/project/codebase scope description
   - `{{entityNames}}` — names of key entities in context
   - `{{analysisType}}` — strategic/technical/operational

3. Estimate total tokens and validate fit within provider limits:
   - Count prompt tokens + context tokens
   - Verify total < 900K (leaving room for response)
   - If over budget, trim lowest-priority blocks via `trimBlocksToFit`

### Done when

- Prompts rendered with all variables
- Total token count within provider limits
- Bundle updated with final prompts if modified

---

## Step 4: Execute Analysis Script

**Who:** Assigned agent
**Pause:** Yes (script execution may take minutes)

### Actions

1. Check which API keys are available:
   - `ANTHROPIC_API_KEY` — for Claude
   - `OPENAI_API_KEY` — for GPT
   - `GOOGLE_API_KEY` — for Gemini

2. Build the provider list from available keys:
   ```
   providers = []
   if ANTHROPIC_API_KEY: providers.append("anthropic")
   if OPENAI_API_KEY: providers.append("openai")
   if GOOGLE_API_KEY: providers.append("google")
   ```

3. If at least one key is available, run the script:
   ```bash
   npx ts-node packages/flowstate-cli/scripts/deep-analyze.ts \
     --bundle .flowstate/analysis/bundles/<bundle-file>.json \
     --providers <comma-separated-list> \
     --max-response-tokens 32000
   ```

4. If no keys are available:
   - Save the bundle file path and instructions
   - Report to user:
     ```
     Context bundle saved to: .flowstate/analysis/bundles/<file>.json
     Run manually: npx ts-node packages/flowstate-cli/scripts/deep-analyze.ts --bundle <path> --providers anthropic,openai
     ```
   - **Pause.** Wait for user to run manually and confirm.

5. Wait for script completion. Expected outputs:
   - `.flowstate/analysis/outputs/<slug>/synthesis.md` — unified analysis
   - `.flowstate/analysis/outputs/<slug>/response-<provider>.md` — per-provider responses
   - `.flowstate/analysis/outputs/<slug>/metadata.json` — execution metadata

### Done when

- Script completed successfully (or user confirmed manual execution)
- `synthesis.md` exists in the output directory
- Per-provider response files exist

---

## Step 5: Create FlowState Document

**Who:** Assigned agent
**Pause:** No

### Actions

1. Read `synthesis.md` from the output directory

2. Create a FlowState document:
   ```
   document-create:
     title: "Deep Analysis: <analysis question summary>"
     documentType: "note"
     content: <synthesis.md content>
     projectId: <project_id>
   ```

3. Set `workspaceId` and `metadata.localPath` on the document:
   ```
   collection-update documents <document_id> {
     "workspaceId": "<workspaceId>",
     "metadata": { "localPath": ".flowstate/analysis/outputs/<slug>/synthesis.md", "analysisType": "<type>" },
     "orgId": "<orgId>"
   }
   ```

4. Add FlowState reference header to the `synthesis.md` file:
   ```markdown
   > **FlowState Document:** `<document_id>`
   > **FlowState Project:** `<project_id>`
   > **Analysis Date:** YYYY-MM-DD
   ```

5. Report results to user:
   ```
   Deep analysis complete.
   - Synthesis: .flowstate/analysis/outputs/<slug>/synthesis.md
   - Document: <document_id>
   - Providers: <list of providers that responded>
   - Token usage: <input/output totals>
   ```

### Done when

- FlowState document created with synthesis content
- Local file has reference header
- Results reported to user

---

## Error Handling

| Situation                       | Action                                                            |
| ------------------------------- | ----------------------------------------------------------------- |
| No API keys available           | Save bundle, prompt user to run manually                          |
| Context assembly returns empty  | Check RAG sync status, verify entity IDs exist                    |
| Script execution fails          | Read stderr, check API key validity, retry with fewer providers   |
| Token budget exceeded           | Trim lowest-priority blocks, re-estimate, retry                   |
| Synthesis output is empty       | Check per-provider responses; if all empty, report upstream error |
| Config file missing             | Run `flowstate-config-validation` skill first                     |
| MCP tool call fails             | Log error, skip that source, continue with remaining sources      |

---

## Conventions

| Item                | Convention                                                             |
| ------------------- | ---------------------------------------------------------------------- |
| Bundle path         | `.flowstate/analysis/bundles/<slug>-<timestamp>.json`                  |
| Output path         | `.flowstate/analysis/outputs/<slug>/`                                  |
| Document type       | `note` (FlowState document)                                           |
| Analysis types      | `strategic`, `technical`, `operational`                                |
| Token budget        | 900K total (100K reserved for response)                                |
| Default profile     | Engineering IC (30% entities, 25% RAG, 20% docs, 15% fs, 5% biz, 5% mem) |
| Provider list       | `anthropic`, `openai`, `google`                                        |

---

## Integration

**Called by:**

- Direct user request ("I need a deep analysis of...")
- Pre-cursor to `flowstate-brainstorming` (automatic context enrichment)
- Pre-cursor to `flowstate-multi-phase-planning` (analysis-informed decomposition)

**Delegates to:**

- `flowstate-context-assembly` (Step 2) — reusable context collection
- `deep-analyze.ts` script (Step 4) — multi-provider LLM execution

**Produces input for:**

- `flowstate-brainstorming` — synthesis document as starting context
- `flowstate-multi-phase-planning` — synthesis as supplementary context
- `flowstate-writing-plans` — analysis outputs as architectural reference

---

_Created: 2026-04-13_
