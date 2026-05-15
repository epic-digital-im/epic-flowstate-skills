---
name: flowstate-forgejo-pr-workflow
description: Use when listing, viewing, creating, checking out, updating, commenting on, closing, or merging Forgejo pull requests for FlowState repositories with `fj` - provides gh-like PR command patterns and Forgejo-specific pitfalls
---

# Forgejo PR Workflow

**Status:** Active
**Purpose:** Use `fj` for pull request operations on Forgejo-hosted FlowState repositories
**Scope:** PR discovery, inspection, creation, checkout, comments, edits, close, and merge
**Trigger:** User asks for `gh pr`-style behavior against Forgejo
**Prerequisite:** Invoke `flowstate-forgejo-cli` first

---

## Overview

Forgejo PR commands are close to `gh pr`, but repo targeting is inconsistent in `fj v0.5.0`. For searches and creation, prefer explicit `-r owner/repo`. For view/status/checkout, run from a repo whose Forgejo remote is configured and pass `-H <host>` globally.

```
resolve repo -> search/view -> inspect diff/files/checks -> create/update/merge only when requested
```

---

## Read-Only Commands

### List PRs

```bash
fj -H forgejo.example.test pr search -r owner/repo
fj -H forgejo.example.test pr search -r owner/repo --state all
fj -H forgejo.example.test pr search -r owner/repo --creator epicadmin
```

`fj pr search` does not accept `-R origin` in `fj v0.5.0`.

### View PR Body

```bash
fj -H forgejo.example.test pr view 428 body
```

### View PR Details

```bash
fj -H forgejo.example.test pr view 428 files
fj -H forgejo.example.test pr view 428 commits
fj -H forgejo.example.test pr view 428 diff
fj -H forgejo.example.test pr view 428 comments
fj -H forgejo.example.test pr view 428 labels
```

### Check PR Status

```bash
fj -H forgejo.example.test pr status 428
fj -H forgejo.example.test pr status 428 --wait
```

Known `fj v0.5.0` caveat: on some Forgejo Actions responses, `pr status` can fail with `the response from forgejo was not properly structured` while other PR reads still work. If that happens, use:

```bash
fj -H forgejo.example.test actions tasks -R origin
fj -H forgejo.example.test pr view 428 body
```

Do not re-auth just because `pr status` fails.

---

## Create PRs

Prefer a body file for non-trivial PRs:

```bash
fj -H forgejo.example.test pr create \
  -r owner/repo \
  --base dev \
  --head codex/my-branch \
  --body-file /tmp/pr-body.md \
  "feat(scope): concise title"
```

Autofill is available:

```bash
fj -H forgejo.example.test pr create -r owner/repo --base dev --head codex/my-branch --autofill
```

Draft PR convention:

```bash
fj -H forgejo.example.test pr create -r owner/repo --base dev --head codex/my-branch "WIP: title"
```

FlowState PR bodies should include:

- Summary
- Test plan with checked evidence
- `Built with Epic Flowstate` when the project commit/PR convention calls for it

---

## Checkout PRs

```bash
fj -H forgejo.example.test pr checkout 428 --branch-name review/pr-428
```

For SSH:

```bash
fj -H forgejo.example.test pr checkout 428 --ssh true --branch-name review/pr-428
```

After checkout, inspect before editing:

```bash
git status --short
git branch --show-current
```

---

## Mutating Commands

| Need | Command |
| ---- | ------- |
| Comment | `fj -H <host> pr comment 428 --body-file /tmp/comment.md` |
| Edit | `fj -H <host> pr edit 428 ...` |
| Assign | `fj -H <host> pr assign 428 <user>` |
| Unassign | `fj -H <host> pr unassign 428 <user>` |
| Close | `fj -H <host> pr close 428` |
| Merge | `fj -H <host> pr merge 428` |

Run `fj pr <command> --help` before mutating when exact flags matter. `fj` is younger than `gh`; subcommand flags change faster than muscle memory.

---

## Red Flags - STOP

- Using `fj pr search -R origin`; use `-r owner/repo`
- Treating `pr status` parser failures as failed CI without checking `actions tasks`
- Creating a PR without verifying current branch, base branch, and pushed head branch
- Merging or closing a PR without explicit user instruction or an approved FlowState finishing workflow

---

## Cross-references

- `flowstate-forgejo-cli` for host/auth/targeting
- `flowstate-forgejo-actions` for CI task status and workflow dispatch
- `flowstate-finishing-branch` for integration decisions after implementation
- `flowstate-code-review` and `flowstate-receiving-code-review` for review loops

---

_Created: 2026-05-15_
