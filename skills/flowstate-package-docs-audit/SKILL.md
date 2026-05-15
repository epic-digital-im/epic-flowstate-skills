---
name: flowstate-package-docs-audit
description: Use when a monorepo package set may have missing, stale, or non-standard package docs, package-local agent skills, Dojo skill/course manifests, or feature inventory links - scans packages and produces a reviewable backfill queue.
---

# FlowState Package Docs Audit

**Status:** Active
**Purpose:** Audit package-local human docs, package agent skills, Dojo artifacts, and feature inventory coverage before deep feature reconciliation.
**Scope:** Monorepos with packages under `packages/*`.
**Trigger:** Before docs/skills backfill, before feature matrix audit, or when package knowledge coverage is unknown.
**Input:** Monorepo root path.
**Output:** Package audit report and backfill queue covering docs, skills, Dojo manifests, catalog course content, and feature inventory links.

---

## Overview

Package documentation audit is the first step before feature matrix audit. The global feature audit needs package-level evidence, so every package must have predictable human docs, package-local agent skills, Dojo publish manifests, catalog course content, and a feature inventory.

```text
scan packages -> validate docs/skills/dojo/config/features -> classify gaps -> write report -> queue backfill
```

---

## Workflow

1. Discover packages.
   - Find `packages/*/package.json`.
   - Skip archived/generated folders only when a package clearly opts out.

2. Check `.flowstate/config.json`.
   - Confirm `orgId`, `workspaceId`, and `projectId` when available.
   - Confirm `documentation.enabled`.
   - Confirm `documentation.type`, `title`, `description`, `category`, and `order`.
   - Flag unsupported values such as `documentation.type = "service"`.

3. Check human docs structure.
   - `.flowstate/docs/index.md`
   - `.flowstate/docs/feature-matrix/index.md`
   - `.flowstate/docs/api/index.md`
   - `.flowstate/docs/workflows/index.md`
   - `.flowstate/docs/troubleshooting/index.md`
   - `.flowstate/docs/maintenance/index.md`
   - Each markdown page includes YAML frontmatter with `title`, `order`, and `description`.
   - Every fenced code block includes a language identifier.

4. Check App Router compatibility.
   - Flag flat nested pages such as `.flowstate/docs/quick-start.md`.
   - Require subdirectory `index.md` pages.
   - Root `.flowstate/docs/index.md` is the only markdown file directly under `docs/`.

5. Check package agent skills.
   - `.flowstate/skills/<skill-slug>/SKILL.md`.
   - Skill frontmatter has `name` and trigger-focused `description`.
   - Skill name is normalized without doubled `flowstate-` prefix.
   - Skill covers entry points, commands, workflows, verification, pitfalls, and feature inventory pointers.
   - Optional specialized skills are present only when useful.

6. Check package feature matrix.
   - `.flowstate/feature-matrix/package-features.json`
   - `.flowstate/docs/feature-matrix/index.md`
   - `.flowstate/feature-matrix/handoff-note.md`
   - Feature rows include strong global matrix links when known and unresolved candidates when not.

7. Check maintenance signals.
   - README exists or package docs replace it.
   - Package commands are documented.
   - Public exports/routes/commands are documented.
   - Tests or verification commands are documented.

8. Check npm scope hygiene.
   - Use `flowstate-epicdm-npm-scope`.
   - Treat `@epicdm` as canonical.
   - Flag `@epic-flow` references as legacy rename debt.
   - Classify legacy references as `safe-to-update`, `requires-code-review`, or `intentional-compatibility`.

9. Check Dojo readiness.
   - Use `flowstate-package-dojo-audit`.
   - Confirm `.flowstate/dojo/skill.yaml`, `.flowstate/dojo/course.json`, and `.flowstate/dojo/sync-state.json` exist for publishable packages.
   - Confirm Dojo skill/course versions match `package.json` `version`.
   - Confirm human docs and package-local skills are behaviorally aligned.
   - Confirm course lessons cover overview, API, workflows, troubleshooting, maintenance, and feature matrix docs.
   - Run local `flowstate dojo skill validate <skill.yaml>` only when the CLI is available and validation is in scope; never publish from the audit skill.

10. Produce report.

---

## Output Shape

```json
{
  "monorepo": "/Users/sthornock/code/epic/epic-flowstate",
  "counts": {
    "packages": 54,
    "docsComplete": 0,
    "docsMissing": 0,
    "docsPartial": 0,
    "skillsComplete": 0,
    "skillsMissing": 0,
    "skillsPartial": 0,
    "featureMatrixMissing": 0
  },
  "packages": [
    {
      "packageName": "@epicdm/flowstate-auth-server",
      "path": "packages/flowstate-auth-server",
      "documentationStatus": "complete|partial|missing|disabled",
      "missingFiles": [],
      "invalidFiles": [],
      "agentSkillStatus": "complete|partial|missing|disabled",
      "missingSkillFiles": [],
      "featureMatrixStatus": "complete|partial|missing",
      "dojoStatus": "ready|partial|missing|blocked",
      "dojoVersionStatus": "matched|mismatched|missing",
      "unresolvedFeatureLinks": 0,
      "legacyNpmScopeReferences": 0,
      "recommendedAction": "none|backfill|repair|manual-review"
    }
  ]
}
```

---

## Report Paths

Use deterministic output paths:

- `.flowstate/package-docs/audits/{auditRunId}/report.json`
- `.flowstate/package-docs/audits/{auditRunId}/report.md`
- `.flowstate/package-docs/audits/{auditRunId}/backfill-queue.json`

---

## Rules

- Do not write package docs from the audit skill.
- Do not write package skills from the audit skill.
- Do not change feature matrix records.
- Do not publish Dojo skills or courses from the audit skill.
- Treat missing package docs as a backfill queue, not an error.
- Treat missing package skills as a backfill queue, not an error.
- Treat missing Dojo manifests as a backfill queue, not an error.
- Keep package paths relative to the monorepo root in reports.
- Enforce the canonical documentation rules embedded in `flowstate-package-docs-standards`: config schema, app/library template choice, markdown frontmatter, nested `index.md` pages, language-tagged code fences, and TSDoc expectations for library APIs.
- Enforce `flowstate-epicdm-npm-scope`: new docs, skills, examples, and feature inventories use `@epicdm`; `@epic-flow` is a legacy finding, not a canonical package scope.
- Enforce `flowstate-package-dojo-sync`: Dojo skill and course manifests are version-locked to `package.json`, human docs and agent skills stay in parity, and publish status is only claimed with same-task CLI evidence.

---

_Created: 2026-05-14_
