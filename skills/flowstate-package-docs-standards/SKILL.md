---
name: flowstate-package-docs-standards
description: Use when creating or reviewing package-local human documentation, package agent skills, documentation config, help center pages, screenshots, or package feature matrices - provides FlowState package documentation and agent-skill quality standards.
---

# FlowState Package Docs Standards

**Status:** Active
**Purpose:** Define the required local human documentation, agent-skill, Dojo publication, and feature inventory structure for FlowState monorepo packages.
**Scope:** Package directories such as `packages/flowstate-auth-server/.flowstate`.
**Trigger:** A package needs new docs, docs review, package-local agent skills, or feature matrix backfill.
**Output:** Package-local human docs, agent skills, Dojo skill/course manifests, and feature inventory evidence.

---

## Overview

Each package owns four local knowledge surfaces:

1. Human documentation under `.flowstate/docs`.
2. Agent skill equivalents under `.flowstate/skills`.
3. Feature inventory and matrix evidence under `.flowstate/feature-matrix`.
4. Dojo skill and catalog course manifests under `.flowstate/dojo`.

Human docs explain the package to people. Package-local skills explain the package to agents in a concise, executable form. Feature inventories preserve current-state evidence for later global feature matrix reconciliation. Dojo manifests publish the same package knowledge into FlowState Cloud Dojo as a versioned skill and course.

The global architecture feature matrix remains the source of truth for planned capability coverage. Package audit work should link obvious matches and defer uncertain mappings instead of forcing them.

Package npm identity must follow `flowstate-epicdm-npm-scope`: `@epicdm` is the canonical npm organization for FlowState packages, and `@epic-flow` is legacy rename debt. Generated docs, skills, examples, and feature inventories must not introduce new `@epic-flow` references.

Package Dojo identity and versioning must follow `flowstate-package-dojo-sync`: the package `package.json` version is the version authority, and Dojo skill/course manifests must match that version when publishable.

---

## Required Files

Every package with `package.json` should have:

```text
packages/<package>/.flowstate/
├── config.json
├── docs/
│   ├── index.md
│   ├── feature-matrix/
│   │   └── index.md
│   ├── api/
│   │   └── index.md
│   ├── workflows/
│   │   └── index.md
│   ├── troubleshooting/
│   │   └── index.md
│   └── maintenance/
│       └── index.md
├── skills/
│   └── <skill-slug>/
│       └── SKILL.md
├── feature-matrix/
│   ├── package-features.json
│   └── handoff-note.md
└── dojo/
    ├── skill.yaml
    ├── course.json
    └── sync-state.json
```

Optional package-local skills:

```text
packages/<package>/.flowstate/skills/
├── <skill-slug>/
│   └── SKILL.md
├── <skill-slug>-development/
│   └── SKILL.md
├── <skill-slug>-testing/
│   └── SKILL.md
└── <skill-slug>-troubleshooting/
    └── SKILL.md
```

Create the minimal package skill first. Split into multiple skills only when one file becomes too broad or the package has distinct operational modes.

---

## App Router Rule

Do not create flat documentation pages such as:

```text
.flowstate/docs/getting-started.md
```

Nested pages must live in directories with `index.md`:

```text
.flowstate/docs/getting-started/index.md
```

---

## Canonical Documentation Process

Package documentation is aggregated from each package's `.flowstate/docs` directory into the FlowState documentation site. A package participates by declaring a `documentation` block in `.flowstate/config.json` and by placing route-compatible markdown pages under `.flowstate/docs`.

The documentation process has four parts:

1. Add package documentation config.
2. Create route-compatible markdown files.
3. Follow markdown frontmatter and code block rules.
4. Leave docs sync to the docs-sync owner unless explicitly in scope.

---

## Required Config

Each package `.flowstate/config.json` must include:

```json
{
  "documentation": {
    "enabled": true,
    "type": "app|library",
    "title": "Package Title",
    "description": "Short searchable description",
    "category": "apps|core|integrations|tools",
    "order": 1
  }
}
```

If the package is internal, experimental, or boilerplate, set `enabled: false` and explain why in `documentation.reason`.

Use `type: "library"` for backend services, workers, gateways, SDKs, shared runtime modules, CLIs, and developer tools unless the documentation schema is explicitly expanded. Use `category: "core"` for core services and runtime packages, `category: "tools"` for CLI/developer utilities, and `category: "integrations"` for external connector packages. Do not invent `type: "service"` or `category: "services"`.

When the current task scope does not allow config edits, record the exact patch needed in docs and feature inventory.

Use app templates for user-facing applications and library templates for developer libraries, services, workers, gateways, CLIs, and SDKs. Template content should be adapted from package evidence, not copied blindly.

---

## Human Docs Requirements

Every human-facing markdown page under `.flowstate/docs` should include YAML frontmatter:

```yaml
---
title: Page Title
order: 1
description: Brief page description
---
```

All fenced code blocks in human docs must include a language identifier such as `typescript`, `javascript`, `json`, `yaml`, `bash`, `text`, or `markdown`. Use `text` for directory trees and ASCII diagrams. Unlabeled code fences can break the documentation site.

For library packages, public TypeScript source should carry TSDoc when API docs are expected. Supported tags include `@description`, `@param`, `@returns`, and `@example`.

### `docs/index.md`

- Package purpose
- Where it runs
- Public API, routes, commands, or entry points
- Installation/build/test commands
- Runtime dependencies
- Related packages
- Feature matrix link
- Maintenance ownership

### `docs/feature-matrix/index.md`

- Package feature inventory
- Strong FlowState feature matrix record links
- Unresolved local features or low-confidence candidates
- Feature status table
- Evidence references
- Gaps and follow-ups

### `docs/api/index.md`

- Public exports, handlers, routes, commands, or SDK entry points
- Inputs/outputs
- Auth/permission expectations
- Error behavior

### `docs/workflows/index.md`

- Common package workflows
- Integration examples
- Expected results

### `docs/troubleshooting/index.md`

- Known failure modes
- Debug commands
- Common logs/errors
- Recovery steps

### `docs/maintenance/index.md`

- Build/test/typecheck/lint commands
- Release notes expectations
- PR documentation checklist
- Ownership and update cadence

---

## Package Skill Requirements

Each package-local skill must:

- Use a normalized `<skill-slug>` derived from the package name.
- Be stored under `.flowstate/skills/<skill-name>/SKILL.md`.
- Include YAML frontmatter with `name` and trigger-focused `description`.
- Prefer package-relative paths.
- Point to `.flowstate/docs` for human detail and `.flowstate/feature-matrix/package-features.json` for feature evidence.
- Include exact verification commands agents should run after changes.
- Include package-specific pitfalls, config/env/secrets, and out-of-scope boundaries.

The package skill is not a marketing overview. It is the agent equivalent of operational docs: concise, executable, and evidence-backed.

Do not install package-local skills into the global user skill directory during package backfill. They are package artifacts first; promotion to shared skills is a later review decision.

---

## Dojo Publication Requirements

Every publishable package must keep Dojo artifacts beside docs:

- `.flowstate/dojo/skill.yaml` publishes the package-local agent skill to the Dojo skill catalog.
- `.flowstate/dojo/course.json` publishes the package human docs through the Dojo catalog `course` command family, which produces the packaged course artifact consumed by Dojo learning surfaces.
- `.flowstate/dojo/sync-state.json` records cloud IDs, version IDs, verification status, and unresolved sync items.

The Dojo skill and course versions must match `package.json` `version`. Human docs and agent skills must describe the same package behavior before either artifact is published.

Course lessons should map to the required docs pages: overview, API, workflows, troubleshooting, maintenance, and feature matrix. Screenshots and videos belong under `.flowstate/docs/media` and must only be referenced when they exist or are known stable external URLs.

Use `flowstate-package-dojo-sync` for manifest shapes, CLI commands, publish gates, and sync-state rules.

### Package Skill Naming

Normalize skill names deterministically:

1. Start from the unscoped package directory or package name slug.
2. Remove npm scope such as `@epicdm/`. If the source package or docs use `@epic-flow/`, treat that scope as legacy and follow `flowstate-epicdm-npm-scope`.
3. If the slug already starts with `flowstate-`, use it unchanged.
4. Otherwise prefix `flowstate-`.

Examples:

| Package | Skill slug |
| --- | --- |
| `@epicdm/flowstate-auth-server` | `flowstate-auth-server` |
| `flowstate-auth-server` | `flowstate-auth-server` |
| `agent-ui` | `flowstate-agent-ui` |
| `connector-core` | `flowstate-connector-core` |

Do not create doubled names such as `flowstate-flowstate-auth-server`.

---

## Feature Matrix Fields

Each package feature row should include:

| Field | Meaning |
| --- | --- |
| `localFeatureId` | Stable package-local slug |
| `title` | Human-readable feature name |
| `status` | `available`, `partial`, `not-implemented`, `experimental`, or `deprecated` |
| `confidence` | `high`, `medium`, or `low` |
| `flowstateFeatureSlug` | Global feature slug when known |
| `globalFeatureRecordId` | Global feature matrix record id when known |
| `globalServiceRecordId` | Global service record id when known |
| `globalGapRecordId` | Global gap record id when known |
| `productIds` | Products or package projects this feature supports |
| `codeRefs` | File and line evidence |
| `testRefs` | Test file or verification command |
| `notes` | Short audit context |

Use strong links only when the record semantics match package evidence. Broad domain matches should be low-confidence candidates and carried into `handoff-note.md`.

If package evidence includes legacy `@epic-flow` npm references, record them in `handoff-note.md` under `Legacy NPM Scope Findings` unless safely updated in the current pass.

---

## Style Rules

- Use Markdown.
- Use active voice.
- Use package-relative paths in package docs and skills.
- Include exact commands for build, test, lint, and typecheck when known.
- Link related package docs with relative links.
- Do not claim feature availability without code or test evidence.
- Do not claim agent workflow support without source, script, command, or test evidence.
- Keep screenshots in `.flowstate/docs/media/screenshots/...` when needed.
- Preserve generated sections with clear markers if automation updates them.
- Follow the canonical package documentation process embedded in this skill: config schema, app/library template choice, frontmatter, nested `index.md` pages, language-tagged code fences, and TSDoc for library APIs.
- Respect the docs-sync ownership boundary: package backfill produces route-compatible docs; the separate docs-sync project runs `yarn workspace @epicdm/flowstate-docs docs:sync`.

---

## Done When

- `.flowstate/config.json` has a valid `documentation` block or the exact patch is recorded when config edits are out of scope.
- Required human docs exist or are explicitly deferred with reason.
- Required package-local agent skill exists or is explicitly deferred with reason.
- Feature matrix docs and JSON inventory exist.
- Package features link to global FlowState matrix records when the match is obvious.
- Missing, unmatched, or uncertain feature links are explicitly listed for a later reconciliation pass.

---

_Created: 2026-05-14_
