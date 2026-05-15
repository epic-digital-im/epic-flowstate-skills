---
name: flowstate-forgejo-actions
description: Use when inspecting Forgejo Actions task status, dispatching workflows, or managing Actions variables and secrets for FlowState repositories with `fj` - provides gh-run/workflow-like command patterns and CI safety checks
---

# Forgejo Actions

**Status:** Active
**Purpose:** Use `fj` for Forgejo Actions operations on FlowState repositories
**Scope:** Task listing, workflow dispatch, variables, and secrets
**Trigger:** User asks for `gh run`, `gh workflow`, Actions status, CI checks, or repository Actions config on Forgejo
**Prerequisite:** Invoke `flowstate-forgejo-cli` first

---

## Overview

Forgejo uses `fj actions tasks` where GitHub users often expect `gh run list`. Use read-only task inspection before dispatching workflows or changing variables/secrets.

```
tasks -> inspect failure context -> dispatch or mutate config only when requested
```

---

## Task Status

List recent tasks:

```bash
fj -H forgejo.example.test actions tasks -R origin
fj -H forgejo.example.test actions tasks -R origin --page 2
```

Explicit repo form:

```bash
fj -H forgejo.example.test actions tasks -r owner/repo
```

Use this as the fallback when `fj pr status` cannot parse Forgejo's Actions status payload.

---

## Dispatch Workflows

```bash
fj -H forgejo.example.test actions dispatch "Release Check" dev -R origin
```

With inputs:

```bash
fj -H forgejo.example.test actions dispatch "Spec Drift Check" dev \
  -R origin \
  --inputs key=value
```

Before dispatching:

1. Confirm the workflow name exactly as Forgejo displays it.
2. Confirm the ref exists locally or remotely.
3. Confirm the user asked for a run or the FlowState workflow requires one.

---

## Variables

List variables:

```bash
fj -H forgejo.example.test actions variables list -R origin
```

Create or update:

```bash
fj -H forgejo.example.test actions variables create NAME value -R origin
fj -H forgejo.example.test actions variables create NAME value -R origin --force
```

Delete:

```bash
fj -H forgejo.example.test actions variables delete NAME -R origin
```

Variables are not secrets. Do not store credentials, tokens, or private keys in variables.

---

## Secrets

List secret names:

```bash
fj -H forgejo.example.test actions secrets list -R origin
```

Create secret:

```bash
fj -H forgejo.example.test actions secrets create NAME "$SECRET_VALUE" -R origin
```

Secret handling rules:

- Prefer environment variables or stdin-compatible patterns when possible.
- Do not echo secret values.
- Do not include secret values in shell history, issue bodies, PRs, or final answers.
- After creation, verify by listing names only.

---

## GitHub CLI Translation

| GitHub habit | Forgejo `fj` pattern |
| ------------ | -------------------- |
| `gh run list` | `fj -H <host> actions tasks -R origin` |
| `gh run list --limit ...` | `fj -H <host> actions tasks -R origin --page N` |
| `gh workflow run <workflow> --ref <ref>` | `fj -H <host> actions dispatch <workflow> <ref> -R origin` |
| `gh secret list` | `fj -H <host> actions secrets list -R origin` |
| `gh variable list` | `fj -H <host> actions variables list -R origin` |

---

## Common Errors

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `pr status` parser error | `fj v0.5.0` cannot parse a Forgejo Actions job URL shape | Use `actions tasks -R origin` |
| Workflow dispatch fails | Workflow name or ref mismatch | Copy exact workflow name from task list or web UI; verify ref |
| Secret appears in terminal output | Secret was passed literally or echoed | Rotate the secret if exposed; use safer shell handling next time |

---

## Red Flags - STOP

- Dispatching workflows as a substitute for reading current task output
- Creating secrets from pasted values that will appear in chat or command history
- Using variables for credentials
- Reporting CI as green based only on a skipped task; inspect success/failure lines

---

## Cross-references

- `flowstate-forgejo-cli` for host/auth/targeting
- `flowstate-forgejo-pr-workflow` for PR CI context
- `flowstate-verification-before-completion` before claiming CI proves completion

---

_Created: 2026-05-15_
