---
name: flowstate-feature-matrix-audit
description: Use when performing a full evidence-based audit of the FlowState feature matrix against current code, tests, docs, completed projects, and local repo .flowstate folders. Orchestrates loading, sharding, reconciliation, approval, MCP updates, and status-file writes.
---

# FlowState Feature Matrix Audit

## Purpose

Run a deep audit of the FlowState feature matrix so the matrix reflects current implementation reality across repos and recently completed FlowState work.

This is the top-level orchestration skill.

## Related Skills

- `flowstate-feature-matrix-load`
- `flowstate-feature-code-audit-worker`
- `flowstate-feature-completed-work-audit`
- `flowstate-feature-matrix-reconcile`
- `flowstate-feature-status-write`
- `flowstate-feature-audit-subagent-dispatch`
- Existing: `flowstate-feature-matrix-init`
- Existing: `flowstate-feature-declare`
- Existing: `flowstate-feature-matrix-sync`

## Workflow

1. Validate context.
   - Read `.flowstate/config.json`.
   - Confirm org, workspace, codebase, and project context.
   - Run or apply the checks from `flowstate-codebase-audit` when the repo context is uncertain.

2. Load the matrix.
   - Use `flowstate-feature-matrix-load`.
   - Prefer first-class `features`, `services`, and `gap-items`.
   - Fall back to legacy VCA `records` only for read-only inventory loading.

3. Confirm canonicalization state.
   - If first-class collections are empty and VCA records exist, recommend running `flowstate-feature-matrix-init`.
   - Do not write audit updates to legacy VCA records.

4. Discover repositories.
   - Start from known local repo roots under the active FlowState org.
   - Include codebase records where available.
   - Include repos that have `.flowstate/config.json`.
   - Record missing or unreachable repo paths.

5. Load completed work.
   - Use `flowstate-feature-completed-work-audit`.
   - Pull completed projects, milestones, tasks, specs, documents, and feature/gap relations.

6. Build the audit queue.
   - Include every active feature.
   - Prioritize launch-critical, P0/P1 gap-linked, and recently touched features.
   - Include services and gap items when they affect status.

7. Execute audits.
   - If the user explicitly authorized subagents, use `flowstate-feature-audit-subagent-dispatch`.
   - Otherwise run serially with `flowstate-feature-code-audit-worker` semantics.

8. Reconcile.
   - Use `flowstate-feature-matrix-reconcile`.
   - Generate proposed updates and manual review items.
   - Separate high-confidence updates from risky ones.

9. Request approval.
   - Present proposed matrix updates.
   - Present gap closures separately.
   - Present all `available` upgrades separately.
   - Do not mutate MCP collections without approval.

10. Apply approved updates.
   - Update first-class `features`, `services`, and `gap-items` collections only.
   - Attach evidence metadata when the schema supports it.
   - Keep updates idempotent.

11. Write local status files.
   - Use `flowstate-feature-status-write`.
   - Write `.flowstate/feature-matrix/status.json`.
   - Write `.flowstate/feature-matrix/status.md`.

12. Produce final report.
   - Counts by status.
   - Launch blockers.
   - Recently upgraded/downgraded features.
   - Manual review queue.
   - Repos with missing status files.

## Audit Run Artifact Paths

Use deterministic local paths when writing audit artifacts:

- `.flowstate/feature-matrix/audits/{auditRunId}/matrix.json`
- `.flowstate/feature-matrix/audits/{auditRunId}/worker-results.json`
- `.flowstate/feature-matrix/audits/{auditRunId}/proposed-updates.json`
- `.flowstate/feature-matrix/audits/{auditRunId}/report.md`

## Approval Rules

Approval is required before:

- Updating `features`
- Updating `services`
- Updating `gap-items`
- Closing gaps
- Upgrading any tier to `available`
- Writing status files into repos outside the current workspace

## Status Rubric

- `available`: implementation exists, is reachable in an app or service workflow, and has verification evidence.
- `partial`: meaningful implementation exists, but integration, tests, UI, docs, deployment, or end-to-end proof is incomplete.
- `not-implemented`: no meaningful implementation evidence found.

## Rules

- Treat docs/specs as supporting evidence only.
- Treat completed FlowState tasks as supporting evidence only.
- Prefer conservative status changes when evidence is mixed.
- Keep workers read-only.
- Keep MCP writes centralized after approval.
- Always leave an audit trail that a future audit can diff.
