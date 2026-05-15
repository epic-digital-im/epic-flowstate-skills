---
name: flowstate-forgejo-cli
description: Use when operating a Forgejo-hosted FlowState repository from the terminal with `fj`, especially when replacing `gh` habits, validating auth, choosing host/remote/repo targeting, or avoiding token leaks - provides the shared foundation for Forgejo CLI workflows
---

# Forgejo CLI Foundation

**Status:** Active
**Purpose:** Establish the safe, repeatable `fj` command pattern for FlowState repositories hosted on Forgejo
**Scope:** FlowState repos with a Forgejo remote, usually `origin`, and agents familiar with GitHub `gh`
**Trigger:** Any terminal operation against Forgejo using `fj`
**Output:** Verified host/auth/targeting context for downstream `fj` skills

---

## Overview

`fj` is the Forgejo-native CLI closest to `gh`, but it is not a drop-in replacement. Global options must come before the subcommand, some subcommands infer the repo from `-R origin`, and others require `-r owner/repo`.

```
verify binary -> verify host -> verify auth -> resolve repo target -> run task skill
```

Invoke this skill before:

- `flowstate-forgejo-pr-workflow`
- `flowstate-forgejo-issue-workflow`
- `flowstate-forgejo-actions`
- `flowstate-forgejo-release-workflow`

---

## Baseline Checks

Run these first in the repository root:

```bash
command -v fj
fj version
git remote -v
```

Expected FlowState Forgejo remote shape:

```text
origin  https://forgejo.example.test/<owner>/<repo>.git (fetch)
origin  https://forgejo.example.test/<owner>/<repo>.git (push)
```

If the Forgejo remote is not `origin`, use that remote name wherever examples show `-R origin`.

---

## Authentication

Preferred auth checks:

```bash
fj -H forgejo.example.test whoami
fj -H forgejo.example.test repo view -R origin
```

If browser login is available:

```bash
fj auth login
```

If token login is required:

```bash
printf '%s' "$FORGEJO_TOKEN" | fj auth add-key <username>
```

### Token Safety

Do not paste or repeat `fj auth list` output in chat, logs, docs, or PRs. In `fj v0.5.0`, `fj auth list` prints the stored token inline with the host.

Use `fj whoami` and a harmless read command instead of `fj auth list` whenever possible.

---

## Targeting Rules

| Need | Pattern |
| ---- | ------- |
| Choose Forgejo host | `fj -H forgejo.example.test <command>` |
| Infer repo from git remote | `<command> -R origin` when supported |
| Pass explicit repo | `<command> -r owner/repo` |
| View current repo | `fj -H forgejo.example.test repo view -R origin` |
| View explicit repo | `fj -H forgejo.example.test repo view owner/repo` |

`-H` is a global option. Put it immediately after `fj`:

```bash
fj -H forgejo.example.test repo view -R origin
```

Do not put it after a subcommand:

```bash
# Wrong: many subcommands reject this
fj repo view -H forgejo.example.test owner/repo
```

---

## GitHub CLI Translation

| GitHub habit | Forgejo `fj` pattern |
| ------------ | -------------------- |
| `gh repo view` | `fj -H <host> repo view -R origin` |
| `gh issue list` | `fj -H <host> issue search -R origin` |
| `gh issue view 123` | `fj -H <host> issue view 123` |
| `gh pr list` | `fj -H <host> pr search -r owner/repo` |
| `gh pr view 123` | `fj -H <host> pr view 123 body` |
| `gh run list` | `fj -H <host> actions tasks -R origin` |
| `gh workflow run <file>` | `fj -H <host> actions dispatch <workflow> <ref> -R origin` |
| `gh release list` | `fj -H <host> release list -R origin` |

---

## FlowState Defaults

For FlowState community repos that mirror from GitHub to Forgejo:

```bash
HOST=forgejo.tailfd3396.ts.net
REMOTE=origin
REPO=$(git remote get-url "$REMOTE" | sed -E 's#.*[:/]([^/]+/[^/.]+)(\.git)?$#\1#')
```

Use the variables only in your shell session. Do not write them into repo files unless the user asked for a script.

---

## Common Errors

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `unexpected argument '-H'` | `-H` was placed after the subcommand | Move `-H <host>` immediately after `fj` |
| `unexpected argument '-R'` on `pr search` | `pr search` does not support remote inference in `fj v0.5.0` | Use `pr search -r owner/repo` |
| Auth looks valid but reads fail | Wrong host selected | Add `fj -H <host>` explicitly |
| Token appears in command output | `fj auth list` was used | Treat output as secret; use `whoami` next time |

---

## Red Flags - STOP

- Pasting `fj auth list` output into conversation or issue text
- Assuming every `gh` subcommand has the same `fj` name
- Running mutating commands (`create`, `edit`, `delete`, `merge`, `dispatch`) before a read-only smoke test succeeds
- Treating a `fj` parsing bug as proof that the token is invalid without testing `whoami` and `repo view`

---

## Cross-references

- `flowstate-forgejo-pr-workflow` for pull requests
- `flowstate-forgejo-issue-workflow` for issues
- `flowstate-forgejo-actions` for Actions tasks, variables, secrets, and dispatch
- `flowstate-forgejo-release-workflow` for tags and releases

---

_Created: 2026-05-15_
