---
name: flowstate-package-docs-feature-audit-prep
description: Use before running FlowState feature matrix audit when package human docs, package agent skills, and package-local feature inventories need to be backfilled, normalized, or verified across a monorepo.
---

# FlowState Package Docs Feature Audit Prep

**Status:** Active
**Purpose:** Prepare package human docs, agent skills, and feature inventories as evidence for a later deep feature matrix audit.
**Scope:** Monorepos with many packages and global FlowState feature matrix records.
**Trigger:** Before `flowstate-feature-matrix-audit`.
**Input:** Monorepo root and global architecture/matrix context.
**Output:** Package docs coverage, package-local skills, local feature inventories, and audit-ready evidence paths.

---

## Overview

Run this before the deep feature matrix audit. It ensures the audit has package-level human docs, agent-operational skills, and feature evidence instead of forcing workers to rediscover basic package facts every time.

```text
package audit -> human docs backfill -> agent skill backfill -> package feature inventory -> feature audit ready
```

---

## Workflow

1. Audit package docs, skills, and feature inventory.
   - Use `flowstate-package-docs-audit`.
   - Produce a backfill queue.
   - Include npm scope hygiene from `flowstate-epicdm-npm-scope`.

2. Backfill missing human docs.
   - Use `flowstate-package-docs-backfill`.
   - Process packages in reviewable batches.
   - Enforce the canonical documentation rules embedded in `flowstate-package-docs-standards`: config schema, page frontmatter, nested `index.md` structure, app/library template choice, code block languages, and TSDoc expectations.

3. Backfill package agent skills.
   - Use `flowstate-package-agent-skills-backfill`.
   - Create package-local skills that agents can use for future package work.

4. Build package feature inventories.
   - Use `flowstate-package-feature-inventory`.
   - Link local package features to global matrix records when the match is obvious.
   - Record unresolved candidates for later reconciliation.
   - Record unresolved `@epic-flow` references as legacy npm scope findings.

5. Verify package audit artifacts.
   - Package path.
   - Package docs path.
   - Package skill path.
   - Package feature matrix path.
   - Strong global feature links.
   - Unmapped local features.
   - Legacy npm scope findings.
   - Manual review items.

6. Produce feature audit input manifest.
   - Include only artifact paths, strong links, unresolved candidates, and manual review notes.
   - Do not require every unresolved feature to be mapped before moving to the next package.

7. Hand off to feature audit.
   - `flowstate-feature-matrix-load`
   - `flowstate-feature-audit-subagent-dispatch`
   - `flowstate-feature-code-audit-worker`
   - `flowstate-feature-matrix-reconcile`

---

## Output Paths

- `.flowstate/package-docs/audits/{auditRunId}/report.json`
- `.flowstate/package-docs/backfill/{auditRunId}/queue.json`
- `.flowstate/package-docs/agent-skills/{auditRunId}/manifest.json`
- `.flowstate/package-docs/feature-inventory/{auditRunId}/manifest.json`
- `.flowstate/package-docs/feature-audit-prep/{auditRunId}/handoff.md`

---

## Done When

- Every package is classified.
- Missing human docs are either backfilled or explicitly deferred.
- Missing package-local agent skills are either backfilled or explicitly deferred.
- Every package has a package-local feature matrix or documented reason it does not.
- Unmapped local features are listed.
- The global feature audit can consume package docs, package skills, and feature inventories as evidence.

---

## Rules

- Do not run the deep feature audit until this prep is complete or consciously waived.
- Do not mutate global feature matrix statuses.
- Do not hide unmapped package features.
- Do not block package coverage on unresolved global matrix links.
- Keep backfill batches small enough for review.
- Do not run docs sync from this prep unless the user explicitly says the docs-sync project is in scope.
- Use `@epicdm` as the canonical npm organization for generated docs, package skills, examples, and feature inventories. Treat `@epic-flow` as legacy rename debt per `flowstate-epicdm-npm-scope`.

---

_Created: 2026-05-14_
