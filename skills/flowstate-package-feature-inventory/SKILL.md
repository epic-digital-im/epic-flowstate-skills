---
name: flowstate-package-feature-inventory
description: Use when a package needs a local feature inventory or package feature matrix linked to global FlowState feature/service/gap records - extracts package capabilities from code, docs, tests, exports, routes, skills, and existing feature matrix data.
---

# FlowState Package Feature Inventory

**Status:** Active
**Purpose:** Build package-local feature inventories that can later be reconciled against the global FlowState feature matrix and package Dojo artifacts.
**Scope:** Package-local `.flowstate/feature-matrix` and `.flowstate/docs/feature-matrix`.
**Trigger:** Before deep feature audits, after package docs/skills backfill, or during PR documentation maintenance.
**Input:** Package path plus optional global feature matrix manifest.
**Output:** Package feature matrix JSON, Markdown, and unresolved-link handoff notes.

---

## Overview

Package feature inventories are current-state evidence. They describe what the package appears to implement now, then link those capabilities to the planned global feature matrix when the match is strong enough to be useful.

```text
package code/docs/tests/skills -> local features -> global matrix candidates -> package matrix files
```

This skill does not need to resolve every global feature link. Unresolved local features and low-confidence candidates are first-class output for a later reconciliation pass.

---

## Evidence Sources

Inspect:

- `package.json` scripts, exports, bin, files, dependencies.
- Source entry points.
- Route handlers, commands, components, providers, adapters.
- Public TypeScript exports.
- Tests and fixtures.
- README and existing docs.
- Package-local skills under `.flowstate/skills`.
- Package Dojo manifests under `.flowstate/dojo`.
- Existing `.flowstate/config.json`.
- Global matrix records from `flowstate-feature-matrix-load`.
- Product links from `flowstate-feature-product-link-audit`.
- Npm scope evidence from `flowstate-epicdm-npm-scope`.

---

## Matching Signals

Use these signals to map local features to global matrix items:

1. Exact global feature slug in docs or comments.
2. Codebase/package path already listed in a global matrix record.
3. Matching title/capability text.
4. Source architecture references.
5. Product/project relations.
6. Manual mapping from an existing package matrix.

---

## Workflow

1. Load package context.
2. Load global feature matrix when available.
3. Extract local features.
4. Search for global matches.
5. Assign confidence:
   - `high`: exact slug or codebase link match.
   - `medium`: strong title/source match.
   - `low`: broad domain match only.
6. Write package feature matrix files.
7. Add manual review rows for unmapped features.
8. Write `.flowstate/feature-matrix/handoff-note.md` with unresolved items.
9. Record `@epic-flow` references as legacy npm scope findings unless safely updated.
10. Record Dojo skill/course links or unresolved Dojo sync items when `.flowstate/dojo/sync-state.json` exists.

---

## Markdown Sections

`docs/feature-matrix/index.md` should include:

1. Package Feature Matrix
2. Global Matrix Links
3. Product Links
4. Unmapped Local Features
5. Global Features Claimed By Package
6. Evidence Appendix
7. Audit Notes
8. Dojo Skill And Course Links

`handoff-note.md` should include:

1. Strong links made.
2. Unresolved local features.
3. Low-confidence global candidates.
4. Negative evidence for expected but missing capabilities.
5. Questions for the later reconciliation pass.
6. Legacy npm scope findings (`@epic-flow` -> `@epicdm`) when present.
7. Dojo sync blockers or missing version links when present.

---

## Rules

- Do not update global feature statuses.
- Do not create global feature records without approval.
- Do not block package backfill on unresolved global links.
- Record negative evidence for expected but missing capabilities.
- Link to package-relative source paths.
- Keep generated JSON deterministic and sorted by `localFeatureId`.
- Treat broad domain matches as `low` confidence candidates, not strong links.
- Use `@epicdm` as the canonical npm package scope in generated feature inventory. Do not treat `@epic-flow` references as product/feature evidence except as legacy rename debt.
- Include package Dojo skill/course identifiers as supporting evidence only after they are present in `sync-state.json`; do not fabricate cloud IDs.

---

_Created: 2026-05-14_
