# FlowState Skills

FlowState Skills is a complete agent-driven methodology for working inside the
FlowState platform — entity management, registration, multi-phase planning,
task execution, code review, business plan and product creation, agent inbox
triage, and process automation — packaged as a set of composable skills with
the bootstrap instructions that make sure your agent uses them.

## Quickstart

Give your agent FlowState Skills:
[Claude Code](#claude-code) ·
[Codex CLI](#codex-cli) ·
[Cursor](#cursor) ·
[Gemini CLI](#gemini-cli) ·
[OpenCode](#opencode) ·
[GitHub Copilot CLI](#github-copilot-cli) ·
[Factory Droid](#factory-droid).

## How It Works

From the moment the session starts, the FlowState bootstrap skill is injected
into your agent's context. The agent sees the full FlowState skill catalog and
the absolute rules — never fabricate IDs, always read `.flowstate/config.json`
before any MCP call, always resolve agent identity before dispatching subagents.

When you ask the agent to onboard a repo, build a feature, triage its inbox, or
spin up a product and business plan, it reaches for the matching skill instead
of guessing. Skills compose: brainstorming hands off to multi-phase planning,
which hands off to task execution, which hands off to code review and branch
finishing — each step gated by the right approval, identity, and time-tracking
sub-skills.

The agent checks for relevant skills before any task. They are mandatory
workflows, not suggestions.

## Installation

Installation differs by harness. If you use more than one, install FlowState
Skills separately for each.

### Claude Code

FlowState Skills is distributed via the Epic Digital marketplace.

- Register the marketplace:

  ```bash
  /plugin marketplace add epic-digital-im/epic-flowstate-skills
  ```

- Install the plugin:

  ```bash
  /plugin install flowstate-skills@epic-flowstate
  ```

### Codex CLI

- Open the plugin search interface:

  ```bash
  /plugins
  ```

- Search for `flowstate-skills` and select **Install Plugin**.

If FlowState Skills is not yet available in the official Codex marketplace,
install directly from this repository by cloning it and pointing your Codex
config at `.codex-plugin/plugin.json`.

### Cursor

- In Cursor Agent chat, install from the marketplace:

  ```text
  /add-plugin flowstate-skills
  ```

- Or search for "flowstate-skills" in the plugin marketplace.

If FlowState Skills is not yet listed, clone this repository and point Cursor
at `.cursor-plugin/plugin.json`.

### Gemini CLI

- Install the extension:

  ```bash
  gemini extensions install https://github.com/epic-digital-im/epic-flowstate-skills
  ```

- Update later:

  ```bash
  gemini extensions update flowstate-skills
  ```

### OpenCode

OpenCode uses its own plugin install; install FlowState Skills separately even
if you already use it in another harness.

- Tell OpenCode:

  ```
  Fetch and follow instructions from https://raw.githubusercontent.com/epic-digital-im/epic-flowstate-skills/main/.opencode/INSTALL.md
  ```

- Detailed docs: [`.opencode/INSTALL.md`](.opencode/INSTALL.md)

### GitHub Copilot CLI

- Register the marketplace:

  ```bash
  copilot plugin marketplace add epic-digital-im/epic-flowstate-skills
  ```

- Install the plugin:

  ```bash
  copilot plugin install flowstate-skills@epic-flowstate
  ```

### Factory Droid

- Register the marketplace:

  ```bash
  droid plugin marketplace add https://github.com/epic-digital-im/epic-flowstate-skills
  ```

- Install the plugin:

  ```bash
  droid plugin install flowstate-skills@epic-flowstate
  ```

## The Basic Workflow

1. **flowstate-using-flowstate-skills** — Loaded at session start. Establishes
   the absolute rules (never fabricate IDs, always read config) and the full
   skill catalog so every other skill is reachable by name.

2. **flowstate-workspace-registration** / **flowstate-codebase-registration** /
   **flowstate-monorepo-audit** — Activates when a repo is not yet linked to
   FlowState. Creates workspace, codebase, and per-package project records and
   writes `.flowstate/config.json` files.

3. **flowstate-brainstorming** — Activates before writing code. Refines rough
   ideas through Socratic discussion, presents the design in chunks for human
   approval, and saves an approved design spec document.

4. **flowstate-multi-phase-planning** — Activates with an approved design.
   Decomposes the spec into one milestone with N phase tasks, each scoping
   goals, deliverables, and acceptance criteria.

5. **flowstate-executing-multi-phase-plan** — Iterates phase tasks in
   `sortOrder` and runs the full task execution lifecycle for each.

6. **flowstate-task-execution** — The 10-step lifecycle: pre-flight check,
   worktree isolation, plan, subagent-driven development, two-stage review,
   PR creation, merge, time tracking, verification.

7. **flowstate-test-driven-development** — Enforced during implementation.
   RED-GREEN-REFACTOR with a failing test before production code.

8. **flowstate-code-review** / **flowstate-receiving-code-review** — Per-task
   and per-milestone review against the design spec. Critical issues block
   progress.

9. **flowstate-finishing-milestone** / **flowstate-completing-milestone** —
   Milestone-level review against spec, followup tasks, and final completion.

10. **flowstate-finishing-branch** — Verifies tests, presents merge/PR/keep/
    discard options, cleans up the worktree.

The agent checks for relevant skills before any task. Mandatory workflows, not
suggestions.

## What's Inside

### Schema & Architecture
- **flowstate-org-schema**, **flowstate-workspace-schema**,
  **flowstate-codebase-schema**, **flowstate-project-schema**,
  **flowstate-milestone-schema**, **flowstate-task-schema** — Field, ID, and
  relationship reference for every collection.
- **flowstate-object-hierarchy**, **flowstate-config-validation** — How IDs
  inherit through `.flowstate/config.json` files; how to diagnose missing IDs.

### Registration & Setup
- **flowstate-workspace-registration**, **flowstate-codebase-registration**,
  **flowstate-monorepo-audit**, **flowstate-create-if-missing**,
  **flowstate-pre-flight-check**.

### Workflow
- **flowstate-brainstorming**, **flowstate-multi-phase-planning**,
  **flowstate-executing-multi-phase-plan**, **flowstate-task-execution**,
  **flowstate-finishing-milestone**, **flowstate-completing-milestone**,
  **flowstate-project-audit**, **flowstate-agent-inbox**,
  **flowstate-document-creation**, **flowstate-visual-companion**.

### Development
- **flowstate-writing-plans**, **flowstate-subagent-development**,
  **flowstate-code-review**, **flowstate-receiving-code-review**,
  **flowstate-finishing-branch**, **flowstate-test-driven-development**,
  **flowstate-systematic-debugging**, **flowstate-dispatching-parallel-agents**,
  **flowstate-using-git-worktrees**, **flowstate-verification-before-completion**.

### Product & Business Plan
- **flowstate-product-schema**, **flowstate-product-create**,
  **flowstate-product-link-projects**, **flowstate-product-link-teammembers**,
  **flowstate-bizplan-schema**, **flowstate-bizplan-create**,
  **flowstate-bizplan-link-product**, **flowstate-bizplan-link-teammembers**,
  **flowstate-creating-a-product**, **flowstate-creating-a-bizplan**.

### Identity, Assignment & Audit
- **flowstate-agent-identity**, **flowstate-entity-assignment**,
  **flowstate-entity-audit**, **flowstate-timetracking**,
  **flowstate-approval-workflow**.

### CLI, Cloud & Infrastructure
- **flowstate-cli-local-auth**, **flowstate-cli-cloud-auth**,
  **flowstate-cli-wallet-auth**, **flowstate-saga-wallet**,
  **flowstate-cloud-gateway-routing**, **flowstate-agent-cli-bootstrap**,
  **flowstate-dojo-cli**, **flowstate-plugin-lifecycle**,
  **flowstate-saga-skill-record**, **flowstate-cloud-deployment**.

### Process Automation
- **flowstate-process-registration**, **flowstate-process-execution**.

### Meta
- **flowstate-writing-skills**, **flowstate-using-flowstate-skills**,
  **flowstate-subtask-template**.

For the full catalog with triggers and dependency map, see
[`skills/flowstate-using-flowstate-skills/SKILL.md`](skills/flowstate-using-flowstate-skills/SKILL.md).

## Philosophy

- **Never fabricate IDs** — every FlowState ID comes from config, an MCP
  response, or the user. No exceptions.
- **Read config before every MCP call** — `orgId`, `workspaceId`,
  `codebaseId`, `projectId` always come from `.flowstate/config.json`.
- **Resolve agent identity before dispatch** — every subagent and every
  entity creation is attributed to a `teamMemberId`.
- **Test-Driven Development** — write tests first, always.
- **Systematic over ad-hoc** — process over guessing.
- **Evidence over claims** — verify before declaring success.

## Repository Layout

```
.
├── .claude-plugin/        Claude Code plugin manifest + marketplace
├── .codex-plugin/         Codex CLI plugin manifest
├── .cursor-plugin/        Cursor plugin manifest
├── .opencode/             OpenCode plugin (JS) + INSTALL.md
├── gemini-extension.json  Gemini CLI extension manifest
├── GEMINI.md              Gemini context file (loads bootstrap skill)
├── hooks/                 Cross-platform SessionStart hook
├── skills/                The full FlowState skill library
├── package.json           npm metadata for OpenCode git+https install
├── AGENTS.md              Symlink to CLAUDE.md (agents.md standard)
├── CLAUDE.md              Contributor + agent guide
└── README.md
```

## Updating

FlowState Skills updates are mostly harness-dependent. Most harnesses pick up
new versions automatically; OpenCode and some npm-pinned setups may need a
plugin reinstall. See each harness's install section above.

## Contributing

1. Fork the repository.
2. Create a branch from `main`.
3. Follow the `flowstate-writing-skills` skill for any new or modified skill.
4. Test on at least one harness — ideally Claude Code and one other.
5. Bump the version in lockstep across every plugin manifest (see CLAUDE.md).
6. Submit a PR describing the problem you solved and the harnesses you tested.

We do not generally accept project-specific or fork-specific skills. Domain
skills belong in their own plugin.

## License

MIT License — see [LICENSE](LICENSE).

## Community

- **Issues**: https://github.com/epic-digital-im/epic-flowstate-skills/issues
- **Maintainer**: Spencer Thornock / [Epic Digital Media](https://www.epicdigital.media)
