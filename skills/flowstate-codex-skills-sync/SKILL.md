---
name: flowstate-codex-skills-sync
description: Use when FlowState skills in the source repository need to be installed, refreshed, compared, or verified in the local Codex skills directory - defines epic-flowstate-skills as source of truth and Codex as a synced consumer.
---

# FlowState Codex Skills Sync

**Status:** Active
**Purpose:** Keep local Codex FlowState skills synchronized from the master FlowState skills repository.
**Source Of Truth:** `/Users/sthornock/code/epic/epic-flowstate-skills/skills`
**Codex Install Target:** `/Users/sthornock/.codex/skills`
**Trigger:** A FlowState skill is created, edited, renamed, or needs to be available to Codex.
**Output:** Codex-installed skill directories copied from the source repository and verified.

---

## Overview

The `epic-flowstate-skills` repository is the master source for FlowState skills. The Codex skills directory is a generated/install target. Edit skills in the source repository first, then sync those source files into Codex.

```text
edit source repo -> validate SKILL.md -> sync to ~/.codex/skills -> verify installed copy
```

Do not treat `~/.codex/skills` as the long-term authoring location for FlowState skills. Changes made only in the Codex install target can be overwritten by the next sync.

---

## Source And Target

| Location | Role |
| --- | --- |
| `/Users/sthornock/code/epic/epic-flowstate-skills/skills` | Master source for FlowState skills |
| `/Users/sthornock/.codex/skills` | Local Codex installed skill target |
| `/Users/sthornock/.codex/skills/.system` | Codex system skills; never overwrite from FlowState source |

---

## Workflow

1. Edit skills in the source repository.
   - Create or update `skills/<skill-name>/SKILL.md`.
   - Use `flowstate-writing-skills` for skill structure and description quality.
   - Keep generated package-local skills in package repos, not in the global FlowState skills source.

2. Validate source skill frontmatter.
   - Every FlowState skill needs YAML frontmatter with `name` and `description`.
   - `name` should match the directory name.
   - Description should be trigger-focused.

3. Sync source skills into Codex.
   - Run `node scripts/sync-codex-skills.mjs` from the source repository.
   - Preserve `~/.codex/skills/.system`.
   - Do not delete Codex system/plugin skills.

4. Verify installed copy.
   - Confirm the expected `SKILL.md` exists in `~/.codex/skills/<skill-name>/SKILL.md`.
   - Confirm frontmatter matches the source.
   - Search installed skills for the new rule or skill name when relevant.

5. Report drift.
   - Installed `flowstate-*` skills missing from source are orphans and should be reviewed before deletion.
   - Source `flowstate-*` skills missing from Codex should be synced.
   - Source/installed content differences should be resolved by copying from source to Codex.

---

## Recommended Sync Command

Use the repo script:

```bash
node scripts/sync-codex-skills.mjs
```

Preview changes first:

```bash
node scripts/sync-codex-skills.mjs --dry-run
```

This updates and adds FlowState skills without deleting Codex system skills or unrelated installed skills. If a skill has been intentionally removed from source, prune installed orphans only after review:

```bash
node scripts/sync-codex-skills.mjs --prune
```

---

## Drift Check

List source skills missing from Codex:

```bash
comm -23 \
  <(find /Users/sthornock/code/epic/epic-flowstate-skills/skills -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort) \
  <(find /Users/sthornock/.codex/skills -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)
```

List installed FlowState skills not present in source:

```bash
comm -13 \
  <(find /Users/sthornock/code/epic/epic-flowstate-skills/skills -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort) \
  <(find /Users/sthornock/.codex/skills -mindepth 1 -maxdepth 1 -type d -name 'flowstate-*' -exec basename {} \; | sort)
```

---

## Verification

Validate all source and installed FlowState skill frontmatter:

```bash
node -e 'const fs=require("fs"), path=require("path"); for (const root of ["/Users/sthornock/code/epic/epic-flowstate-skills/skills", "/Users/sthornock/.codex/skills"]) for (const dir of fs.readdirSync(root)) { if (!dir.startsWith("flowstate-")) continue; const file=path.join(root,dir,"SKILL.md"); if (!fs.existsSync(file)) throw new Error(`${file}: missing`); const s=fs.readFileSync(file,"utf8"); const m=s.match(/^---\n([\s\S]*?)\n---\n/); if(!m) throw new Error(`${file}: missing frontmatter`); if(!new RegExp(`^name: ${dir}$`, "m").test(m[1])) throw new Error(`${file}: name mismatch`); if(!/^description: .+/m.test(m[1])) throw new Error(`${file}: missing description`); } console.log("FlowState source and Codex skills validated");'
```

---

## Rules

- Master FlowState skill edits happen in `/Users/sthornock/code/epic/epic-flowstate-skills/skills`.
- Codex skills under `~/.codex/skills` are synced copies.
- Never overwrite or delete `~/.codex/skills/.system`.
- Do not edit only the installed Codex copy when the change should persist.
- Do not use destructive deletion for orphaned installed skills without review.
- After adding a new source skill, sync and verify it exists in Codex.

---

_Created: 2026-05-14_
