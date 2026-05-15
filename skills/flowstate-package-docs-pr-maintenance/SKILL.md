---
name: flowstate-package-docs-pr-maintenance
description: Use during PR preparation or review when package source files, routes, exports, tests, UI, feature behavior, package docs, package-local agent skills, Dojo skill/course manifests, or package versions may need updates.
---

# FlowState Package Docs PR Maintenance

**Status:** Active
**Purpose:** Keep package human docs, package agent skills, Dojo artifacts, and package feature inventories current as PRs change package behavior.
**Scope:** Pull requests or branch changes in FlowState monorepos.
**Trigger:** Before PR creation, during code review, or after package behavior changes.
**Input:** Changed files and package paths.
**Output:** Documentation/skill update checklist, changed docs/skills, Dojo manifest updates, and package feature matrix updates when needed.

---

## Overview

Documentation and package-skill maintenance are part of the PR definition of done. If a PR changes user-facing behavior, public APIs, routes, commands, package exports, tests, feature status, or package version, package docs, package-local skills, Dojo manifests, and package feature matrices must be reviewed.

---

## Workflow

1. Detect changed packages.
   - Use `git diff --name-only`.
   - Map changed files to `packages/<name>`.

2. Classify documentation impact.
   - API/export change.
   - UI/workflow change.
   - Runtime/config change.
   - Feature added/removed/deprecated.
   - Agent workflow or verification change.
   - Npm scope/package identity change.
   - Package version or Dojo publishable content change.
   - Test-only or internal-only change.

3. Check required docs and skills.
   - Use `flowstate-package-docs-audit` for affected packages.

4. Update human docs when needed.
   - `docs/index.md`
   - `docs/api/index.md`
   - `docs/workflows/index.md`
   - `docs/troubleshooting/index.md`
   - `docs/maintenance/index.md`
   - `docs/feature-matrix/index.md`

5. Update package agent skills when needed.
   - Entry points changed.
   - Commands changed.
   - Verification changed.
   - Known pitfalls changed.
   - Feature inventory paths or conventions changed.

6. Update package feature matrix.
   - Use `flowstate-package-feature-inventory`.
   - Add new local features.
   - Mark removed features as deprecated or removed.
   - Update global feature links when known.
   - Record unresolved candidates for later reconciliation.

7. Update Dojo artifacts when needed.
   - Use `flowstate-package-dojo-audit` for affected packages.
   - Use `flowstate-package-dojo-sync` to update `.flowstate/dojo/skill.yaml`, `.flowstate/dojo/course.json`, and `.flowstate/dojo/sync-state.json`.
   - Match Dojo skill/course versions to `package.json`.
   - Update Dojo catalog course lessons when docs, screenshots, videos, workflows, API behavior, or troubleshooting guidance changes.
   - Validate with `flowstate dojo skill validate <skill.yaml>` when the CLI is available.
   - Do not publish unless the PR task explicitly includes cloud Dojo publish.

8. Check npm scope hygiene.
   - Use `flowstate-epicdm-npm-scope`.
   - Update safe `@epic-flow` docs/examples to `@epicdm`.
   - Record unresolved code/package metadata references as legacy rename findings.

9. Capture screenshots for UI packages when relevant.
   - Store screenshots under `.flowstate/docs/media/screenshots/...`.
   - Use sanitized sample data.
   - Update screenshots when UI behavior or visible state changes.
   - Update Dojo course lesson references when screenshots or videos change.

10. Report PR documentation, skill, Dojo, and feature status.

---

## PR Checklist

```markdown
## Documentation And Package Skills

- [ ] Changed packages identified.
- [ ] Package docs reviewed.
- [ ] Package-local agent skills reviewed.
- [ ] API/workflow/troubleshooting docs updated if needed.
- [ ] Agent workflows/commands/pitfalls updated if needed.
- [ ] Dojo skill/course manifests reviewed and version-matched to `package.json`.
- [ ] Dojo catalog course lessons/media updated if human docs changed.
- [ ] Package feature matrix updated if feature behavior changed.
- [ ] Legacy `@epic-flow` references checked and updated or recorded.
- [ ] Screenshots updated for UI changes.
- [ ] Unmapped local features listed for later feature matrix reconciliation.
```

---

## No-Docs-Needed Rule

If no docs or skill update is needed, state why:

- Internal refactor only.
- Test-only change.
- Build tooling only.
- No public behavior, feature status, API, or agent workflow changed.
- No package identity, npm scope, import, dependency, or docs example changed.
- No package version, Dojo skill content, LMS lesson content, screenshot, or video reference changed.

---

## Rules

- Do not let PRs silently change feature behavior without docs review.
- Do not let PRs silently change agent workflows without package skill review.
- Do not let PRs silently drift Dojo skill/course versions from `package.json`.
- Do not update global matrix records directly; use feature audit/sync skills later.
- Keep package docs changes in the same PR when practical.
- Keep package skill changes in the same PR when practical.
- Keep Dojo manifest updates in the same PR when package docs or package-local skills change.
- For large doc/skill backfills, split into a separate docs PR.
- New package docs, skills, examples, and feature inventories must use `@epicdm`; `@epic-flow` is legacy and should be fixed when safe or recorded for rename follow-up.
- Publish to FlowState Cloud Dojo only when explicitly in scope; otherwise leave manifests ready for the docker/container publish agent.

---

_Created: 2026-05-14_
