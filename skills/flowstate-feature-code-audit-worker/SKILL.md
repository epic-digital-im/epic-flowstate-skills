---
name: flowstate-feature-code-audit-worker
description: Use when an audit agent receives a bounded shard of feature matrix slugs and must inspect code, tests, configs, docs, and implementation traces. Produces evidence only and never mutates FlowState collections.
---

# FlowState Feature Code Audit Worker

## Purpose

Audit a bounded set of feature matrix items against one or more local repositories and return evidence-backed status recommendations.

This is a worker skill. It should be invoked by `flowstate-feature-matrix-audit` or `flowstate-feature-audit-subagent-dispatch`.

## Worker Contract

Workers gather evidence. They do not update MCP collections, write status files, or mark features complete.

## Inputs

```json
{
  "auditRunId": "feat-audit-2026-05-13",
  "features": [],
  "repos": [
    {
      "name": "flowstate-platform",
      "path": "/Users/sthornock/code/epic/flowstate-platform",
      "codebaseId": "code_z31pukaemI"
    }
  ],
  "statusVocabulary": ["available", "partial", "not-implemented"]
}
```

## Workflow

1. Confirm the assigned shard.
   - List feature slugs and expected output count.
   - Do not expand scope unless the orchestrator asks.

2. Build search terms for each feature.
   - Slug fragments.
   - Human title.
   - Key nouns from the description.
   - Known service names, collection names, route names, and package names.

3. Search each repository with `rg`.
   - Prefer targeted searches before broad searches.
   - Include code, tests, package manifests, configs, scripts, docs, and `.flowstate` folders.
   - Record negative searches when no implementation is found.
   - Apply `flowstate-epicdm-npm-scope` when package names appear in evidence: `@epicdm` is canonical, and `@epic-flow` is legacy rename debt.

4. Inspect evidence files.
   - Implementation files.
   - API routes and service boundaries.
   - UI entry points.
   - Tests and fixtures.
   - Migration/schema/config files.
   - Completed task/spec references.

5. Classify status.
   - `available`: implementation exists, is reachable in an app or service workflow, and has test/exercise evidence.
   - `partial`: meaningful implementation exists, but integration, tests, UI, docs, deployment, or end-to-end proof is incomplete.
   - `not-implemented`: no meaningful implementation found, or only docs/specs/stubs exist.

6. Return structured evidence.

## Required Evidence Types

- `implementation`
- `test`
- `config`
- `doc`
- `flowstate-task`
- `negative-search`

## Output Shape

```json
{
  "auditRunId": "feat-audit-2026-05-13",
  "repoScope": ["flowstate-platform"],
  "results": [
    {
      "featureSlug": "layer-4-prompt-assembly-service",
      "currentTiers": {
        "community": "not-implemented",
        "basic": "not-implemented",
        "pro": "not-implemented",
        "enterprise": "not-implemented"
      },
      "recommendedTiers": {
        "community": "partial",
        "basic": "partial",
        "pro": "partial",
        "enterprise": "partial"
      },
      "confidence": "high|medium|low",
      "evidence": [
        {
          "type": "implementation|test|config|doc|flowstate-task|negative-search",
          "repo": "flowstate-platform",
          "path": "packages/example/src/file.ts",
          "line": 42,
          "summary": "What this proves"
        }
      ],
      "gaps": [
        {
          "slug": "gap-layer-4-prompt-assembly-service",
          "priority": "P0|P1|P2|P3",
          "status": "open|in-progress|closed",
          "summary": "What remains"
        }
      ],
      "legacyNpmScopeFindings": [
        {
          "path": "packages/example/README.md",
          "line": 12,
          "reference": "@epic-flow/example",
          "recommendedReplacement": "@epicdm/example",
          "classification": "safe-to-update|requires-code-review|intentional-compatibility",
          "notes": "Short reason"
        }
      ],
      "notes": "Short human-readable finding"
    }
  ]
}
```

## Rules

- Include file paths and line numbers whenever possible.
- Negative evidence must list search terms and paths searched.
- Do not claim `available` from docs alone.
- Do not mutate files or MCP collections.
- Keep findings terse and evidence-first.
- Do not treat `@epic-flow` references as canonical package/product evidence. Record them as legacy npm scope findings unless they are intentional compatibility notes backed by code or package metadata.
