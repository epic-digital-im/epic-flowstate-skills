---
name: flowstate-feature-audit-subagent-dispatch
description: Use when the user explicitly authorizes parallel agents for a feature matrix audit. Shards feature slugs, dispatches bounded code audit workers, and merges their evidence without allowing workers to mutate source-of-truth collections.
---

# FlowState Feature Audit Subagent Dispatch

## Purpose

Coordinate parallel audit agents for a large feature matrix audit.

Use this skill only when the user explicitly authorizes subagents, delegation, or parallel agent work.

## Inputs

- Audit run id
- Normalized feature matrix
- Repo list
- Desired shard strategy
- Worker skill: `flowstate-feature-code-audit-worker`

## Shard Strategies

Preferred order:

1. By feature layer or domain.
2. By owning repo/codebase.
3. By launch priority.
4. By fixed-size batches when metadata is sparse.

## Workflow

1. Confirm explicit authorization.
   - The user must ask for subagents, parallel agents, delegation, or equivalent.

2. Build shards.
   - Keep each shard small enough for deep inspection.
   - Avoid assigning the same feature slug to multiple agents unless cross-checking is intentional.
   - Give each worker a disjoint primary feature set.

3. Dispatch workers.
   - Tell workers they are not alone in the codebase.
   - Tell workers not to mutate files, MCP collections, or git state.
   - Tell workers to return structured JSON evidence.
   - Tell workers to apply `flowstate-epicdm-npm-scope` when package scope evidence appears.

4. Continue local work while workers run.
   - Inspect global context.
   - Prepare reconciliation scaffolding.
   - Do not duplicate assigned worker scans.

5. Collect and validate results.
   - Ensure every assigned feature has a result.
   - Flag malformed evidence.
   - Flag missing negative searches.

6. Hand off to `flowstate-feature-matrix-reconcile`.

## Worker Prompt Template

```text
You are auditing a bounded shard of the FlowState feature matrix.

Scope:
- Audit run: {auditRunId}
- Feature slugs: {featureSlugs}
- Repositories: {repos}

Use the flowstate-feature-code-audit-worker skill. Gather evidence only. Do not edit files, do not update MCP collections, do not change git state, and do not mark anything complete.

Apply flowstate-epicdm-npm-scope when package names appear in evidence. Treat @epicdm as canonical and @epic-flow as legacy rename debt, not canonical product evidence.

Return structured JSON matching the worker output contract, including implementation, test, config, doc, FlowState task, negative-search evidence, and legacy npm scope findings when present.
```

## Rules

- Do not dispatch subagents unless explicitly authorized.
- Do not let workers write source-of-truth data.
- Keep worker scopes disjoint.
- Reconcile centrally.
- Treat low-confidence worker output as manual review.
