---
name: flowstate-feature-matrix-reconcile
description: Use after feature audit workers return evidence to merge recommendations, resolve conflicts, generate proposed feature/service/gap updates, and prepare a human approval package before MCP writes.
---

# FlowState Feature Matrix Reconcile

## Purpose

Merge feature audit evidence into a deterministic set of proposed updates for FlowState feature matrix collections.

This skill prepares updates. It should not apply writes unless human approval has been granted.

## Inputs

- Normalized feature matrix from `flowstate-feature-matrix-load`
- Code audit worker results
- Completed work audit results
- Optional existing local status files

## Workflow

1. Validate input completeness.
   - Every assigned feature should have a worker result.
   - Missing results should be reported as audit gaps.

2. Merge evidence by feature slug.
   - Combine code evidence.
   - Combine test/config/doc evidence.
   - Combine completed FlowState work evidence.
   - Preserve negative searches.

3. Detect conflicts.
   - Multiple workers disagree on status.
   - Completed task claims done but code evidence is missing.
   - Code exists but feature matrix marks all tiers unavailable.
   - Matrix says available but tests/integration evidence is missing.
   - Worker evidence uses legacy `@epic-flow` scope where canonical `@epicdm` package identity is expected.

4. Apply the status rubric.
   - `available`: reachable implementation plus verification evidence.
   - `partial`: meaningful implementation exists but one or more launch requirements are missing.
   - `not-implemented`: no meaningful implementation evidence.

5. Generate proposed updates.
   - Feature tier status changes.
   - Gap status changes.
   - Service status changes if applicable.
   - Codebase links and evidence metadata.

6. Produce a review package.
   - High-confidence updates.
   - Medium-confidence updates.
   - Low-confidence/manual review items.
   - Legacy npm scope findings.
   - Blockers for launch/MVP decisions.

## Approval Gate

Before applying updates:

1. Present summary counts.
2. Present high-impact changes.
3. Present all `available` upgrades.
4. Present all gap closures.
5. Ask for explicit approval.

## Output Shape

```json
{
  "auditRunId": "feat-audit-2026-05-13",
  "summary": {
    "featuresReviewed": 94,
    "proposedFeatureUpdates": 0,
    "proposedGapUpdates": 0,
    "manualReview": 0
  },
  "proposedUpdates": [
    {
      "collection": "features",
      "id": "feat_123",
      "slug": "layer-4-prompt-assembly-service",
      "changes": {
        "tiers.community": {
          "from": "not-implemented",
          "to": "partial"
        }
      },
      "confidence": "high",
      "evidenceRefs": []
    }
  ],
  "manualReview": [],
  "legacyNpmScopeFindings": [],
  "approvalRequired": true
}
```

## Rules

- Do not close gaps without implementation and verification evidence.
- Do not upgrade to `available` from docs, specs, or completed task titles alone.
- Preserve current status when evidence is ambiguous.
- Keep updates idempotent.
- Prefer first-class `features`, `services`, and `gap-items` as write targets.
- Follow `flowstate-epicdm-npm-scope`: `@epicdm` is canonical, and `@epic-flow` findings should become manual review or package rename follow-ups rather than feature status evidence.
