---
name: flowstate-epicdm-npm-scope
description: Use when auditing, documenting, publishing, renaming, or referencing FlowState npm packages and package scopes - defines @epicdm as the canonical npm organization and @epic-flow as legacy scope debt.
---

# FlowState EpicDM NPM Scope

**Status:** Active
**Purpose:** Keep FlowState package names, docs, skills, imports, examples, and release guidance aligned to the canonical `@epicdm` npm organization.
**Scope:** FlowState monorepos, package docs, package-local skills, package feature inventories, README examples, imports, dependency declarations, and release/publish workflows.
**Trigger:** A package name, dependency, import, README command, docs example, feature inventory, package skill, or release process references an npm scope.
**Output:** Canonical `@epicdm` package references, explicit legacy `@epic-flow` findings, and reviewable rename follow-ups.

---

## Overview

`@epicdm` is the canonical npm organization for FlowState packages. `@epic-flow` is legacy and should be treated as rename debt unless a package intentionally documents backwards compatibility.

```text
package evidence -> normalize to @epicdm -> flag @epic-flow -> verify package references
```

This skill does not require every legacy reference to be fixed immediately. It requires agents to identify legacy scope usage, update it when safely in scope, and record unresolved references with file paths and reason.

---

## Canonical Rules

| Item | Rule |
| --- | --- |
| Published npm scope | `@epicdm` |
| Legacy npm scope | `@epic-flow` |
| New package names | Must use `@epicdm/<package>` |
| New docs examples | Must use `@epicdm/<package>` |
| New package-local skills | Must use `@epicdm/<package>` in package identity |
| Existing `@epic-flow` references | Flag as legacy rename debt and update when safe |
| Backwards compatibility references | Keep only when source/package metadata proves an alias or migration path exists |

Do not introduce new `@epic-flow` references in generated docs, skills, examples, package feature inventories, or FlowState records.

---

## When Auditing A Package

1. Read `package.json`.
   - Treat the `name` field as the package identity.
   - If `name` uses `@epic-flow`, flag it as a package metadata rename candidate.
   - If `name` uses `@epicdm`, generated docs and skills should use that exact name.

2. Search package-local references.
   - `package.json`
   - README and changelog files
   - `.flowstate/docs`
   - `.flowstate/skills`
   - `.flowstate/feature-matrix`
   - `src`, tests, examples, and scripts

3. Classify each `@epic-flow` reference.
   - `safe-to-update`: docs, examples, generated skill text, comments, or non-executable guidance.
   - `requires-code-review`: imports, dependencies, package names, lockfile entries, publish config, build scripts.
   - `intentional-compatibility`: migration notes, deprecation notes, compatibility shims, or aliases backed by code/package metadata.

4. Update only safe references unless the task explicitly includes package rename/code migration.

5. Record unresolved references.
   - File path.
   - Current reference.
   - Recommended canonical replacement.
   - Classification.
   - Reason not fixed in this pass.

---

## Package Skill Naming

Package-local FlowState skill names are derived from the unscoped package slug, not the npm organization.

Examples:

| Package | Package-local skill |
| --- | --- |
| `@epicdm/flowstate-auth-server` | `flowstate-auth-server` |
| `@epicdm/flowstate-env` | `flowstate-env` |
| `@epicdm/agent-ui` | `flowstate-agent-ui` |

Do not encode the npm scope into the skill slug. Do not create doubled names such as `flowstate-flowstate-auth-server`.

---

## Documentation And Feature Inventory Requirements

When package docs, package-local skills, or feature inventories are created or maintained:

- Use `@epicdm/<package>` in package identity, install commands, workspace commands, imports, and examples unless package metadata proves otherwise.
- Add `@epic-flow` findings to the package handoff note when they are not fixed.
- Do not call `@epic-flow` an alternate canonical scope.
- Do not use legacy references as evidence that a package belongs to a different product or feature matrix record.
- If a package still publishes or imports under `@epic-flow`, classify it as migration work instead of normalizing silently.

Suggested handoff note section:

```markdown
## Legacy NPM Scope Findings

| Path | Reference | Recommended replacement | Classification | Notes |
| --- | --- | --- | --- | --- |
| `README.md` | `@epic-flow/example` | `@epicdm/example` | `safe-to-update` | Docs example only. |
```

---

## Verification

Use fast text search after edits:

```bash
rg -n "@epic-flow|@epicdm" packages/<package>
```

Package rename or dependency changes require normal package verification, such as:

```bash
yarn workspace @epicdm/<package> typecheck
```

Docs-only updates still need frontmatter/code-fence validation when `.flowstate/docs` changed.

---

## Rules

- `@epicdm` is canonical for FlowState npm packages.
- `@epic-flow` is legacy rename debt, not a peer canonical namespace.
- Do not invent alias support.
- Do not modify lockfiles or package publish metadata unless the task includes dependency/package rename work.
- Keep rename findings reviewable and package-local when they are not fixed.
- Prefer precise file-path findings over broad "scope mismatch" notes.

---

_Created: 2026-05-14_
