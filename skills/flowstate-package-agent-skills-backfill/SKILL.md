---
name: flowstate-package-agent-skills-backfill
description: Use when a package lacks package-local agent skill equivalents for its docs, commands, workflows, verification, pitfalls, or feature inventory - provides package skill creation and maintenance standards.
---

# FlowState Package Agent Skills Backfill

**Status:** Active
**Purpose:** Create package-local agent skill equivalents for package human docs and feature inventories.
**Scope:** `packages/<package>/.flowstate/skills`.
**Trigger:** Package docs are being backfilled, package behavior changed, or package-local agent guidance is missing/stale.
**Input:** Package path, package docs, package source, tests, scripts, and feature inventory.
**Output:** One or more package-local `SKILL.md` files that agents can use for future package work.

---

## Overview

Human docs explain the package to people. Package-local skills explain the package to agents in an executable, context-efficient form.

```text
package evidence -> package skill -> agent workflows -> verification pointers
```

Create the smallest useful skill first. Split into multiple skills only when a package has clearly separate operational modes.

---

## Required Output

Every package should have at least:

```text
packages/<package>/.flowstate/skills/<skill-slug>/SKILL.md
```

Optional split skills:

```text
packages/<package>/.flowstate/skills/<skill-slug>-development/SKILL.md
packages/<package>/.flowstate/skills/<skill-slug>-testing/SKILL.md
packages/<package>/.flowstate/skills/<skill-slug>-troubleshooting/SKILL.md
```

Do not install these into `~/.codex/skills` or the shared `epic-flowstate-skills` repo during package backfill. Package-local skills are reviewed and promoted later only when they prove reusable.

---

## Workflow

1. Load package evidence.
   - `package.json` scripts, exports, bin, dependencies.
   - Human docs under `.flowstate/docs`.
   - Source entry points, routes, commands, providers, adapters, and tests.
   - `.flowstate/feature-matrix/package-features.json` when present.
   - Canonical documentation rules embedded in `flowstate-package-docs-standards`.
   - Canonical npm scope rules embedded in `flowstate-epicdm-npm-scope`.

2. Choose skill scope.
   - Start with one package skill.
   - Split only if the skill would mix unrelated audiences or workflows.

3. Write frontmatter.
   - `name`: normalized `<skill-slug>`.
   - `description`: trigger-focused, not a workflow summary.
   - Use `flowstate-writing-skills` description guidance.
   - Prefix `flowstate-` unless the package slug already starts with `flowstate-`.
   - Do not create doubled names such as `flowstate-flowstate-auth-server`.
   - Use the unscoped package slug; `@epicdm` is the canonical npm organization and `@epic-flow` is legacy rename debt.

4. Write operational content.
   - Package identity and purpose.
   - Entry points and public surface.
   - Common workflows.
   - Verification commands.
   - Config/env/secrets.
   - Feature inventory pointers.
   - Known pitfalls.
   - Out-of-scope boundaries.

5. Cross-link package docs and feature inventory.
   - Link human docs by package-relative path.
   - Link feature JSON and handoff note.
   - Point agents to unresolved feature links instead of hiding them.

6. Verify.
   - Confirm the skill file exists.
   - Confirm frontmatter has `name` and `description`.
   - Confirm no global-only or stale package paths are hardcoded.
   - Confirm commands match `package.json`.

---

## Template

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

- Use package-relative paths.
- Prefer concise executable guidance over long prose.
- Do not copy all human docs into the skill.
- Do not claim package behavior without source, script, or test evidence.
- Do not force unresolved global feature links.
- Do not run docs sync from this skill.
- Keep package skill changes reviewable with the package docs and feature inventory changes.
- Package skills must reference human docs that follow `flowstate-package-docs-standards`; do not create agent-only guidance as a substitute for required human docs.
- Package skills must follow `flowstate-epicdm-npm-scope`: use `@epicdm` in package identity and examples, and record unresolved `@epic-flow` references as legacy findings.

---

_Created: 2026-05-14_
