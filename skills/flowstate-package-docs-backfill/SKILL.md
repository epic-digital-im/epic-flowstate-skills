---
name: flowstate-package-docs-backfill
description: Use when packages lack package-local human docs, package agent skills, documentation config, or feature inventory files generated from package evidence and FlowState package standards.
---

# FlowState Package Docs Backfill

**Status:** Active
**Purpose:** Create or repair missing package-local human docs, package agent skills, and feature inventory scaffolding.
**Scope:** One package or a backfill queue from `flowstate-package-docs-audit`.
**Trigger:** Package docs, package skills, or feature inventory are missing, partial, stale, or not route-compatible.
**Input:** Package path and optional audit queue item.
**Output:** Standard `.flowstate/docs`, `.flowstate/skills`, and package feature matrix files.

---

## Overview

Backfill docs and skills conservatively from evidence in the package. Prefer accurate placeholders over confident guesses.

```text
inspect package -> infer docs type -> create human docs -> create package skill -> write feature inventory -> verify
```

---

## Prerequisites

- Use `flowstate-package-docs-standards`.
- Use `flowstate-epicdm-npm-scope`.
- Read the package's `package.json`.
- Read existing `.flowstate/config.json`, README, source entry points, tests, scripts, and existing docs.
- If creating local files that should be indexed as FlowState documents, use `flowstate-document-creation` after the local content exists.

---

## Workflow

1. Inspect package metadata.
   - `package.json` name, description, scripts, exports, dependencies.
   - Source folders such as `src`, `app`, `server`, `routes`, `commands`, `components`.
   - Test folders and examples.
   - Normalize package identity to `@epicdm` when generating docs and skills; flag any `@epic-flow` evidence as legacy rename debt.

2. Determine documentation type.
   - `app`: user-facing app or UI package.
   - `library`: SDK, utility, shared package, backend service, worker, gateway, CLI, generator, or developer utility.
   - Use `category: "core"` for server, worker, gateway, or runtime service packages.
   - Use `category: "tools"` for CLI, script, generator, or developer utility packages.

3. Update or record `.flowstate/config.json`.
   - Add or repair `documentation` when config edits are in scope.
   - Preserve existing FlowState ids and unrelated config.
   - If config edits are out of scope, record the exact patch needed in docs and `package-features.json`.

4. Create missing human docs.
   - `docs/index.md`
   - `docs/feature-matrix/index.md`
   - `docs/api/index.md`
   - `docs/workflows/index.md`
   - `docs/troubleshooting/index.md`
   - `docs/maintenance/index.md`
   - Each page must include YAML frontmatter with `title`, `order`, and `description`.
   - Every fenced code block must include a language identifier.

5. Create missing package agent skills.
   - Minimal required file: `.flowstate/skills/<skill-slug>/SKILL.md`.
   - Normalize `<skill-slug>` using `flowstate-package-docs-standards`: prefix `flowstate-` unless the package slug already starts with `flowstate-`.
   - Optional split files only when useful: `<skill-slug>-development`, `<skill-slug>-testing`, `<skill-slug>-troubleshooting`.
   - Include entry points, commands, workflows, verification, feature matrix pointers, and package-specific pitfalls.
   - The skill must be usable by an agent without rereading all docs, but should link to docs for deeper human context.

6. Create package feature matrix files.
   - `.flowstate/feature-matrix/package-features.json`
   - `.flowstate/docs/feature-matrix/index.md`
   - `.flowstate/feature-matrix/handoff-note.md`

7. Add explicit unknowns.
   - Use `TBD` or `needs-audit` for unclear behavior.
   - Do not invent APIs, screenshots, or feature statuses.
   - Do not force global feature links. Strong obvious links only; unresolved candidates go in the handoff note.
   - Add a `Legacy NPM Scope Findings` section to the handoff note when `@epic-flow` references remain.

8. Verify.
   - Confirm all required files exist.
   - Confirm nested pages use directory `index.md`.
   - Confirm package skill frontmatter has `name` and `description`.
   - Parse `package-features.json`.
   - Run package typecheck or the closest lightweight package command when available.
   - Do not run docs sync unless the user explicitly asks; docs sync is commonly owned by a separate project.

---

## Package Feature JSON Shape

```json
{
  "packageName": "@epicdm/flowstate-auth-server",
  "packagePath": "packages/flowstate-auth-server",
  "generatedAt": "2026-05-14T00:00:00.000Z",
  "projectId": "proj_c9zgqs0Q5t",
  "documentationConfigFinding": {},
  "agentSkillFinding": {},
  "features": [
    {
      "localFeatureId": "oauth-pkce-login",
      "title": "OAuth PKCE Login",
      "status": "available|partial|not-implemented|experimental|deprecated",
      "confidence": "high|medium|low",
      "flowstateFeatureSlug": "layer-1-auth-flows",
      "globalFeatureRecordId": "rec__hYF2jX-QER",
      "globalServiceRecordId": null,
      "globalGapRecordId": null,
      "productIds": [],
      "codeRefs": [],
      "testRefs": [],
      "notes": ""
    }
  ],
  "unmappedLocalFeatures": [],
  "unimplementedGlobalFeatures": []
}
```

---

## Package Skill Template

```markdown
---
name: <skill-slug>
description: Use when working on <package-name> package behavior, docs, tests, routes, exports, or feature inventory - provides package-specific entry points, workflows, verification, and pitfalls.
---

# <Package Title>

**Status:** Active
**Package:** `<package-name>`
**Path:** `packages/<package>`
**Purpose:** <one-sentence package purpose>
**Use When:** Agents need to modify, audit, test, or explain this package.

---

## Entry Points

- `<path>` - <what agents need to know>

## Common Workflows

```bash
<package commands>
```

## Verification

- Typecheck:
- Test:
- Lint:
- Build:

## Configuration

- Env vars, config files, secrets, service dependencies.

## Feature Inventory

- Human docs: `.flowstate/docs/index.md`
- Feature matrix: `.flowstate/feature-matrix/package-features.json`
- Handoff note: `.flowstate/feature-matrix/handoff-note.md`

## Pitfalls

- Package-specific cautions and known failure modes.

## Out Of Scope

- Work agents should not do from this package skill.
```

---

## Rules

- Use `apply_patch` for file edits.
- Preserve existing docs unless replacing generated placeholders.
- Do not flatten nested docs.
- Do not claim `available` without source or test evidence.
- Do not update global FlowState feature records from this skill.
- Do not install package-local skills into the global skills directory during package backfill.
- Do not run docs sync as part of package backfill unless explicitly requested.
- Follow the canonical documentation rules embedded in `flowstate-package-docs-standards`: docs config, app/library template choice, frontmatter, nested `index.md` pages, code block languages, and TSDoc expectations for library APIs.
- Follow `flowstate-epicdm-npm-scope`: use `@epicdm` for generated package names, docs examples, workspace commands, and package skill identity; treat `@epic-flow` as a legacy finding.
- If many packages are backfilled, work from a queue and keep each package change reviewable.

---

_Created: 2026-05-14_
