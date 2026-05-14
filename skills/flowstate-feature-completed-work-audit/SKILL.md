---
name: flowstate-feature-completed-work-audit
description: Use during feature matrix audits to inspect recently completed FlowState projects, milestones, tasks, specs, and feature relations as evidence for current implementation status.
---

# FlowState Feature Completed Work Audit

## Purpose

Review recently completed FlowState work and extract feature implementation evidence that may not be obvious from code search alone.

Use this skill with code audit results before reconciling feature matrix status.

## Inputs

- `orgId`
- `workspaceId`
- Optional `codebaseId`
- Optional date range
- Optional project ids
- Optional feature slugs

## Workflow

1. Load recently completed entities.
   - Projects
   - Milestones
   - Tasks
   - Documents/specs
   - Entity relations involving features, services, and gaps

2. Filter for relevant work.
   - Completed or recently closed items.
   - Items with feature declarations.
   - Items linked to launch readiness, gap analysis, product matrix, or platform architecture.
   - Items that mention assigned feature slugs.

3. Inspect linked documents.
   - Specs
   - Implementation plans
   - Reviews
   - Gap analysis files
   - Status reports

4. Extract evidence.
   - What feature was touched.
   - What implementation was completed.
   - What verification was recorded.
   - What gaps or follow-ups remain.

5. Cross-check against code audit output.
   - Completed work can raise confidence when code evidence agrees.
   - Completed work cannot make a feature `available` without implementation evidence.
   - Completed work can explain why a feature should remain `partial`.

## Output Shape

```json
{
  "auditRunId": "feat-audit-2026-05-13",
  "completedWorkWindow": {
    "from": "2026-01-01",
    "to": "2026-05-13"
  },
  "results": [
    {
      "featureSlug": "layer-4-prompt-assembly-service",
      "evidence": [
        {
          "type": "flowstate-task|flowstate-milestone|flowstate-document|relation",
          "id": "task_123",
          "title": "Implement prompt assembly",
          "status": "completed",
          "summary": "What this proves"
        }
      ],
      "remainingQuestions": []
    }
  ]
}
```

## Rules

- Treat FlowState task status as supporting evidence, not final proof.
- Prefer linked specs and verification notes over task titles alone.
- Flag completed items that have no matching code evidence.
- Flag code evidence that has no matching project/task provenance when it appears launch-critical.
