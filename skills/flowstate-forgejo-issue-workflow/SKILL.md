---
name: flowstate-forgejo-issue-workflow
description: Use when searching, viewing, creating, commenting on, assigning, closing, or browsing Forgejo issues for FlowState repositories with `fj` - provides gh-like issue command patterns and safe issue creation conventions
---

# Forgejo Issue Workflow

**Status:** Active
**Purpose:** Use `fj` for issue operations on Forgejo-hosted FlowState repositories
**Scope:** Issue discovery, inspection, templates, creation, comments, assignment, and closure
**Trigger:** User asks for `gh issue`-style behavior against Forgejo
**Prerequisite:** Invoke `flowstate-forgejo-cli` first

---

## Overview

`fj issue search` is the Forgejo equivalent of `gh issue list`. Most issue commands support `-R origin`, which is the preferred FlowState repo pattern after host auth is verified.

```
search -> view -> inspect comments/templates -> create or mutate only when requested
```

---

## Read-Only Commands

### List/Search Issues

```bash
fj -H forgejo.example.test issue search -R origin
fj -H forgejo.example.test issue search -R origin --state all
fj -H forgejo.example.test issue search -R origin --labels bug
fj -H forgejo.example.test issue search -R origin "DTS build"
```

### View Issue

```bash
fj -H forgejo.example.test issue view 399 body
fj -H forgejo.example.test issue view 399 comments
```

### Templates

```bash
fj -H forgejo.example.test issue templates -R origin
```

If blank issues are disabled, issue creation must pass `--template <name>`.

---

## Create Issues

Use a body file for any issue that includes logs, checklists, or reproduction steps:

```bash
fj -H forgejo.example.test issue create \
  -R origin \
  --body-file /tmp/issue-body.md \
  "Fix DTS build errors in db-collections"
```

If templates are enabled:

```bash
fj -H forgejo.example.test issue create \
  -R origin \
  --template bug_report \
  --body-file /tmp/issue-body.md \
  "Fix DTS build errors"
```

Use `--no-template` only when the repo allows blank issues and the user explicitly wants a blank issue.

---

## Mutating Commands

| Need | Command |
| ---- | ------- |
| Comment | `fj -H <host> issue comment 399 --body-file /tmp/comment.md` |
| Assign | `fj -H <host> issue assign 399 <user>` |
| Unassign | `fj -H <host> issue unassign 399 <user>` |
| Edit | `fj -H <host> issue edit 399 ...` |
| Close | `fj -H <host> issue close 399` |
| Browse | `fj -H <host> issue browse 399` |

Run `fj issue <command> --help` before mutating if the exact flags are unclear.

---

## FlowState Issue Body Pattern

For implementation or bug-tracking issues, include:

```markdown
## Problem

## Evidence

## Expected Result

## Verification
```

For FlowState process gaps, link to the relevant skill name instead of duplicating long skill content.

---

## Red Flags - STOP

- Using `gh issue list` out of habit when the repo remote is Forgejo
- Creating an issue from memory without first searching for duplicates
- Pasting secrets, access tokens, or `fj auth list` output into the body
- Closing an issue without confirming it is resolved or explicitly requested

---

## Cross-references

- `flowstate-forgejo-cli` for host/auth/targeting
- `flowstate-bug-report-tracking` for FlowState CLI/API/MCP/database gotchas
- `flowstate-task-execution` when an issue becomes executable task work

---

_Created: 2026-05-15_
