---
name: flowstate-package-dojo-audit
description: Use when auditing whether package docs, package-local skills, Dojo skill manifests, Dojo LMS course manifests, and package versions are aligned before publish or feature matrix reconciliation.
---

# FlowState Package Dojo Audit

**Status:** Active
**Purpose:** Detect version, docs, agent skill, Dojo skill, LMS course, and feature-link drift for a package.
**Scope:** One package or a package-docs audit queue.
**Trigger:** Before package docs backfill, PR merge, Dojo publish, or deep feature matrix audit.
**Input:** Package path, docs audit output, package feature inventory, and optional cloud catalog lookup output.
**Output:** Dojo readiness findings and remediation queue.

---

## Overview

This audit answers one question: can the package documentation set be safely synced to FlowState Cloud Dojo and later reconciled with the feature matrix?

```text
package -> docs/skills/features -> dojo manifests -> version lock -> publish readiness
```

---

## Checks

1. Package identity.
   - `package.json` exists.
   - `name` uses canonical `@epicdm` scope unless the package is intentionally private/unscoped.
   - `version` exists and is semver-like.

2. Human docs and package skill parity.
   - `.flowstate/docs` required pages exist.
   - `.flowstate/skills/<skill>/SKILL.md` exists.
   - Human docs and agent skill describe the same commands, entry points, verification, and pitfalls.

3. Feature matrix links.
   - `.flowstate/feature-matrix/package-features.json` exists and parses.
   - Strong global feature links are recorded when known.
   - Unmapped local features are explicit.

4. Dojo manifests.
   - `.flowstate/dojo/skill.yaml` exists.
   - `.flowstate/dojo/course.json` exists and parses.
   - `.flowstate/dojo/sync-state.json` exists and parses.
   - Manifest publisher is present and stable.

5. Version lock.
   - `skill.yaml` `metadata.version` equals `package.json` `version`.
   - `course.json` `version` equals `package.json` `version`.
   - `sync-state.json` `packageVersion` equals `package.json` `version`.

6. Course content.
   - Course lessons include overview, API, workflows, troubleshooting, maintenance, and feature matrix coverage unless a page is intentionally deferred.
   - Lesson IDs are stable and sorted.
   - Screenshots/videos referenced by lessons exist under `.flowstate/docs/media` or are external URLs that were intentionally supplied.

7. CLI validation.
   - Run `flowstate dojo skill validate <skill.yaml>` when the CLI is available.
   - Do not run publish commands unless publishing is explicitly in scope.

---

## Finding Shape

```json
{
  "packageName": "@epicdm/example",
  "packagePath": "packages/example",
  "packageVersion": "0.0.0",
  "dojoStatus": "ready|partial|missing|blocked",
  "versionStatus": "matched|mismatched|missing",
  "humanAgentParity": "matched|drift|unknown",
  "missingFiles": [],
  "versionMismatches": [],
  "missingLessons": [],
  "invalidMediaRefs": [],
  "publishReadiness": "ready|needs-auth|needs-validation|blocked",
  "recommendedAction": "none|backfill-dojo|repair-version|manual-review|publish"
}
```

---

## Rules

- Audit may read cloud catalog state, but it must not publish.
- Treat missing Dojo manifests as backfill work, not as a package failure.
- Treat version drift as blocking for publish.
- Treat human docs vs agent skill drift as blocking for publish.
- Do not require screenshots or videos unless the course references them or the package UI workflow needs them.
- Keep findings package-relative and deterministic for queue processing.

---

_Created: 2026-05-15_
