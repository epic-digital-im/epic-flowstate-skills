---
name: flowstate-codebase-audit
description: Use before multi-phase planning or brainstorming to validate the codebase config is complete and accurate - wraps `flowstate audit --format json` and blocks planning if errors exist
---

# Codebase Audit

**Status:** Active
**Purpose:** Run `flowstate audit` to validate `.flowstate/config.json` integrity before planning or task execution
**Scope:** Any codebase with a `.flowstate/config.json` that may have stale or missing IDs
**Trigger:** Called by `flowstate-multi-phase-planning` (Step 0) and `flowstate-brainstorming` (reality check gate)

---

## Overview

Planning against stale or missing FlowState config leads to orphaned entities and broken references. This skill runs `flowstate audit --format json` and blocks the calling workflow if any `MISSING_*` or `INVALID_*` errors are found.

```
Run Audit -> Parse Results -> Errors? -> Block or Continue
    (1)          (2)           (3)           (4)
```

---

## Step 1: Run Audit

**Who:** Assigned agent
**Pause:** No

### Actions

1. Read `.flowstate/config.json` to confirm the file exists
2. Run the audit:
   ```bash
   flowstate audit . --format json
   ```
3. Capture the JSON output

### Done when

- Audit command completes without crashing
- JSON output captured

---

## Step 2: Parse Results

**Who:** Assigned agent
**Pause:** No

### Actions

1. Parse the JSON output. Expected shape:
   ```json
   {
     "summary": { "errors": 0, "warnings": 0, "info": 0 },
     "results": [
       { "category": "config", "severity": "error", "code": "MISSING_CODEBASE_ID", "message": "..." }
     ]
   }
   ```
2. Count errors by severity: `error`, `warning`, `info`
3. Group errors by category: `config`, `db`, `docs`

### Done when

- Error counts and categories extracted
- Results grouped for display

---

## Step 3: Evaluate Gate

**Who:** Assigned agent
**Pause:** Only if errors found

### Actions

1. If `summary.errors === 0`:
   - Log: "Codebase audit passed. Proceeding."
   - Return `{ passed: true, summary }` to the calling workflow
2. If `summary.errors > 0`:
   - Log: "Codebase audit FAILED with {N} errors."
   - Display the error list to the user
   - Attempt auto-fix: `flowstate audit . --fix --dry-run` to preview fixes
   - Ask user: "Run `flowstate audit --fix` to auto-repair, or abort?"
3. If user approves fix:
   - Run `flowstate audit . --fix`
   - Re-run audit to verify: `flowstate audit . --format json`
   - If still errors, block and escalate

### Done when

- Either: audit passed and control returned to caller
- Or: errors fixed and re-audit passes
- Or: user chooses to abort

---

## Conventions

| Item | Convention |
|------|-----------|
| Audit command | `flowstate audit . --format json` |
| Fix command | `flowstate audit . --fix` |
| Gate behavior | Blocks planning on any `error` severity |
| Warnings | Logged but do not block |
| Output | Returns `{ passed: boolean, summary, errors[] }` |

---

_Created: 2026-04-12_
