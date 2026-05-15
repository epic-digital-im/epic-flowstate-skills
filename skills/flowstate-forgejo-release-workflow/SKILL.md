---
name: flowstate-forgejo-release-workflow
description: Use when listing, creating, viewing, editing, or deleting Forgejo releases and tags for FlowState repositories with `fj` - provides gh-release/tag-like command patterns and release safety gates
---

# Forgejo Release Workflow

**Status:** Active
**Purpose:** Use `fj` for tags and releases on Forgejo-hosted FlowState repositories
**Scope:** Release listing, release creation, assets, tags, drafts, prereleases, and deletion
**Trigger:** User asks for `gh release` or tag-style behavior against Forgejo
**Prerequisite:** Invoke `flowstate-forgejo-cli` first

---

## Overview

Releases and tags are high-blast-radius operations. Use read-only listing and version verification before creating or deleting anything.

```
list tags/releases -> verify version/ref/artifacts -> create draft/prerelease/release -> verify
```

---

## Read-Only Commands

List releases:

```bash
fj -H forgejo.example.test release list -R origin
```

View a release:

```bash
fj -H forgejo.example.test release view v1.2.3 -R origin
```

List tags:

```bash
fj -H forgejo.example.test tag list -R origin
```

View a tag:

```bash
fj -H forgejo.example.test tag view v1.2.3 -R origin
```

---

## Create Tags

Create a tag from a branch:

```bash
fj -H forgejo.example.test tag create v1.2.3 -R origin --branch main --body "Release v1.2.3"
```

Before creating a tag:

```bash
git fetch origin --tags
git tag --list 'v1.2.3'
git rev-parse origin/main
```

Never create a tag from an unverified local branch when releasing FlowState packages.

---

## Create Releases

Create a release for an existing tag:

```bash
fj -H forgejo.example.test release create v1.2.3 \
  -R origin \
  --tag v1.2.3 \
  --body "$(cat /tmp/release-notes.md)"
```

Create a draft:

```bash
fj -H forgejo.example.test release create v1.2.3 \
  -R origin \
  --tag v1.2.3 \
  --body "$(cat /tmp/release-notes.md)" \
  --draft
```

Create a prerelease:

```bash
fj -H forgejo.example.test release create v1.2.3-rc.1 \
  -R origin \
  --tag v1.2.3-rc.1 \
  --body "$(cat /tmp/release-notes.md)" \
  --prerelease
```

Attach artifacts:

```bash
fj -H forgejo.example.test release create v1.2.3 \
  -R origin \
  --tag v1.2.3 \
  --body "$(cat /tmp/release-notes.md)" \
  --attach dist/app.tar.gz
```

---

## Assets

Inspect asset commands before use:

```bash
fj release asset --help
```

Use assets for built artifacts, checksums, SBOMs, or signed bundles. Do not attach logs containing secrets.

---

## Mutating Commands

| Need | Command |
| ---- | ------- |
| Edit release | `fj -H <host> release edit <name> -R origin ...` |
| Delete release | `fj -H <host> release delete <name> -R origin` |
| Delete tag | `fj -H <host> tag delete <name> -R origin` |
| Browse release | `fj -H <host> release browse <name> -R origin` |

Deletion requires explicit user instruction or an approved release rollback process.

---

## Release Body Pattern

```markdown
## Summary

## Packages

## Verification

## Migration Notes
```

Keep release notes user-facing. Link to PRs or issues instead of pasting long logs.

---

## Red Flags - STOP

- Creating a tag before verifying the target commit
- Creating a release from a dirty working tree without understanding why
- Deleting a release or tag without explicit approval
- Attaching build artifacts before checksums/signatures are ready when the release process expects them

---

## Cross-references

- `flowstate-forgejo-cli` for host/auth/targeting
- `flowstate-forgejo-actions` for release verification workflows
- `flowstate-verification-before-completion` before claiming a release is complete

---

_Created: 2026-05-15_
