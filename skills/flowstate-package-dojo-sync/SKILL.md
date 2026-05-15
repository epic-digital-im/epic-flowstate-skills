---
name: flowstate-package-dojo-sync
description: Use when package documentation, package-local agent skills, package versions, or Dojo catalog course lessons need to be published or reconciled with FlowState Cloud Dojo - provides version-locked Dojo skill and course sync rules.
---

# FlowState Package Dojo Sync

**Status:** Active
**Purpose:** Keep package-local human docs, agent skills, Dojo skill manifests, Dojo catalog course manifests, and package versions in lockstep.
**Scope:** `packages/<package>/.flowstate/dojo` plus package docs, package-local skills, and feature inventory.
**Trigger:** Package docs audit/backfill, PR docs maintenance, package version bump, package-local skill update, or LMS content update.
**Input:** Package path, `package.json`, package docs, package-local skills, feature inventory, and Dojo publisher identity.
**Output:** Version-matched Dojo skill manifest, Dojo course manifest, sync state, and publish/verification commands.

---

## Overview

Every documented package owns four synchronized knowledge surfaces:

1. Human documentation under `.flowstate/docs`.
2. Agent skill equivalents under `.flowstate/skills`.
3. Dojo skill publication manifest under `.flowstate/dojo/skill.yaml`.
4. Dojo catalog course publication manifest under `.flowstate/dojo/course.json`.

The package `package.json` version is the version authority. Dojo skill versions and Dojo catalog course versions must match it exactly unless the package is explicitly marked non-publishable with a reason.

Non-publishable packages are marked in `.flowstate/dojo/sync-state.json` with `"publishable": false` and a non-empty `"nonPublishableReason"`. Audit and sync steps should still verify human docs, package-local skills, and feature inventory, but they should not require `skill.yaml` or `course.json` publish readiness and must not run publish commands for that package.

```text
package version -> human docs -> package skill -> dojo skill/course manifests -> cloud publish -> sync state
```

---

## Required Files

Every publishable package should have:

```text
packages/<package>/.flowstate/dojo/
├── skill.yaml
├── course.json
└── sync-state.json
```

Optional local media used by course lessons:

```text
packages/<package>/.flowstate/docs/media/
├── screenshots/
└── videos/
```

Use `sync-state.json` to record cloud identifiers and last verification without making cloud state the source of truth.

---

## Version Rules

1. Read `package.json` `name` and `version`.
2. Require `.flowstate/dojo/skill.yaml` `metadata.version` to equal `package.json` `version`.
3. Require `.flowstate/dojo/course.json` `version` to equal `package.json` `version`.
4. Require human docs and package-local skills to describe the same behavior for that version.
5. If package behavior changes without a package version bump, record a blocking audit finding.
6. If docs or package skills change without package behavior changing, still keep Dojo manifests at the current package version and republish only when the Dojo catalog should receive the update.

Do not invent independent documentation, skill, or LMS versions.

---

## Dojo Skill Manifest

`skill.yaml` must use the CLI schema accepted by `flowstate dojo skill validate`:

```yaml
apiVersion: dojo/v1
kind: Skill
metadata:
  id: flowstate-<package-slug>
  name: <Package Display Name>
  version: 0.0.0
  publisher: epic-digital
  description: Package-local agent skill for <package-name>.
  tags:
    - flowstate
    - package
spec:
  content: |
    <concise agent-facing content derived from .flowstate/skills/<skill>/SKILL.md>
  instructions: |
    Use this skill with the package human docs, feature inventory, and Dojo course linked in sync-state.json.
```

Rules:

- `metadata.id` should be stable and package-derived.
- `metadata.publisher` must match the Dojo publisher slug used by the authenticated operator or agent.
- `spec.content` is the agent skill equivalent. It should summarize the package-local skill, not paste every human doc page.
- Composite skills are allowed only when the package intentionally composes existing published Dojo skills.

Validate before publish:

```bash
flowstate cloud dojo skill validate packages/<package>/.flowstate/dojo/skill.yaml
```

Publish:

```bash
flowstate cloud dojo skill publish packages/<package>/.flowstate/dojo/skill.yaml
```

---

## Dojo Catalog Course Manifest

`course.json` targets the singular Dojo catalog `course publish` command, not the plural LMS CRUD `courses` command family. It must use the generated `CoursePublishRequest` shape from `packages/flowstate-cli/src/generated/dojo/types.ts`:

```json
{
  "id": "flowstate-<package-slug>",
  "name": "<Package Display Name>",
  "version": "0.0.0",
  "publisher": "epic-digital",
  "kind": "standard",
  "description": "Human course for <package-name> documentation and workflows.",
  "lessons": [
    {
      "id": "overview",
      "title": "Overview",
      "contentKind": "markdown",
      "content": "<lesson content or URL>",
      "sortOrder": 1
    }
  ]
}
```

Lessons should map to the package docs set:

- Overview from `.flowstate/docs/index.md`.
- API from `.flowstate/docs/api/index.md`.
- Workflows from `.flowstate/docs/workflows/index.md`.
- Troubleshooting from `.flowstate/docs/troubleshooting/index.md`.
- Maintenance from `.flowstate/docs/maintenance/index.md`.
- Feature matrix from `.flowstate/docs/feature-matrix/index.md`.

Screenshots, videos, and other assets should be package-local under `.flowstate/docs/media` and referenced from lesson content only when they exist and are current. Do not fabricate media references.

Publish the packaged catalog course artifact:

```bash
flowstate cloud dojo course publish packages/<package>/.flowstate/dojo/course.json
```

---

## Sync State

`sync-state.json` records the most recent known cloud state:

```json
{
  "packageName": "@epicdm/example",
  "packageVersion": "0.0.0",
  "publishable": true,
  "nonPublishableReason": null,
  "publisher": "epic-digital",
  "dojoSkillId": "flowstate-example",
  "dojoSkillVersionId": null,
  "dojoCourseId": "flowstate-example",
  "dojoCourseVersionId": null,
  "lastPublishedAt": null,
  "lastVerifiedAt": null,
  "verification": {
    "skillValidate": "not-run|passed|failed",
    "skillPublish": "not-run|passed|failed",
    "coursePublish": "not-run|passed|failed"
  },
  "featureMatrixLinks": [],
  "unresolvedItems": []
}
```

Never mark publish verification as passed unless the CLI command was run and its output was checked in the same task.

---

## Workflow

1. Load package context.
   - `package.json` name and version.
   - `.flowstate/docs` human docs.
   - `.flowstate/skills` package-local skills.
   - `.flowstate/feature-matrix/package-features.json`.

2. Check version alignment.
   - `package.json` version.
   - `skill.yaml` `metadata.version`.
   - `course.json` `version`.
   - `sync-state.json` `packageVersion`.

3. Backfill or update manifests.
   - Create missing `.flowstate/dojo` files when package docs are in scope.
   - Preserve existing cloud IDs and publisher slugs.
   - Keep lesson IDs stable so course updates do not create needless churn.

4. Validate local Dojo skill manifest.
   - Run `flowstate cloud dojo skill validate <skill.yaml>` when cloud CLI is available.
   - If cloud auth is unavailable, run bare `flowstate dojo skill validate <skill.yaml>` because validation is local.

5. Publish only when approved or explicitly in scope.
   - `flowstate cloud dojo skill publish <skill.yaml>`.
   - `flowstate cloud dojo course publish <course.json>`.
   - Capture version IDs and status in `sync-state.json` when returned.

6. Reconcile docs and feature matrix links.
   - Human docs, package skill, Dojo skill, Dojo course, and package feature matrix should point to each other by local path and known cloud IDs.
   - Unresolved links go in `sync-state.json.unresolvedItems` and `.flowstate/feature-matrix/handoff-note.md`.

---

## Verification

Minimum local verification:

```bash
node -e 'const fs=require("fs"); const p="packages/<package>/package.json"; const pkg=JSON.parse(fs.readFileSync(p,"utf8")); const course=JSON.parse(fs.readFileSync("packages/<package>/.flowstate/dojo/course.json","utf8")); if(course.version!==pkg.version) throw new Error("course version mismatch"); console.log("dojo course version matches package")'
flowstate dojo skill validate packages/<package>/.flowstate/dojo/skill.yaml
```

Publish verification in a cloud-authenticated container:

```bash
flowstate cloud dojo skill publish packages/<package>/.flowstate/dojo/skill.yaml
flowstate cloud dojo course publish packages/<package>/.flowstate/dojo/course.json
flowstate cloud dojo skill get flowstate-<package-slug> --json
flowstate cloud dojo course get flowstate-<package-slug>
```

---

## Rules

- Do not publish from a local developer shell unless the task explicitly includes cloud publish.
- Prefer the docker/container agent for publish work because it has the FlowState Cloud Dojo CLI and auth context.
- Do not let human docs and agent skills describe different package behavior.
- Do not let Dojo skill/course versions drift from `package.json`.
- Do not fabricate screenshots, videos, lesson media, cloud IDs, or publish status.
- Do not update global feature matrix statuses directly from this skill; use feature audit/sync skills for global records.
- Preserve package-local source of truth: cloud state is a synchronized target, not the authoring location.
- Keep generated manifests deterministic and reviewable.

---

_Created: 2026-05-15_
