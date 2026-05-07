---
name: flowstate-rag-sync-check
description: Use at task execution Step 0 to verify the current codebase is indexed in the RAG store and post-commit hooks are installed - blocks task start if checks fail, auto-fixes when possible
---

# RAG Sync Check

**Status:** Active
**Purpose:** Verify RAG indexing health before task execution begins
**Scope:** Called at `flowstate-task-execution` Step 0
**Trigger:** Before any task work starts

---

## Overview

Ensures the current codebase has been indexed into the RAG vector store and that incremental sync hooks are in place. Without this, semantic search during planning and development will return stale or empty results.

```
Check Index -> Check Hook -> Check Endpoints -> Pass or Fix
     (1)          (2)             (3)              (4)
```

---

## Step 1: Check Codebase Index

**Who:** Assigned agent
**Pause:** No

### Actions

1. Run the codebase status command:
   ```bash
   flowstate codebase status --json
   ```
2. Parse the JSON output and check:
   - `filesIndexed > 0` — at least one file has been indexed
   - `totalChunks > 0` — at least one chunk exists in the vector store
3. If both are zero, the codebase has never been indexed

### Done when

- Index status captured (indexed or not)

---

## Step 2: Check Post-Commit Hook

**Who:** Assigned agent
**Pause:** No

### Actions

1. Check if the post-commit hook exists and contains the FlowState sync line:
   ```bash
   test -x .git/hooks/post-commit && grep -q "flowstate codebase sync" .git/hooks/post-commit
   ```
2. Record whether the hook is installed

### Done when

- Hook status captured (installed or not)

---

## Step 3: Check Endpoints

**Who:** Assigned agent
**Pause:** No

### Actions

1. Verify the Kong gateway is reachable:
   ```bash
   curl -sf http://localhost:7080/health > /dev/null
   ```
2. If the gateway is down, log a warning (non-blocking for local-only work)

### Done when

- Endpoint reachability recorded

---

## Step 4: Gate Decision

**Who:** Assigned agent
**Pause:** Only if auto-fix needed

### Actions

1. If all checks pass:
   - Log: "RAG sync check passed."
   - Return to caller
2. If index is empty:
   - Log: "Codebase not indexed. Running initial sync..."
   - Auto-fix: `flowstate codebase sync`
   - Re-check status after sync
3. If hook is missing:
   - Log: "Post-commit hook not installed. Installing..."
   - Auto-fix: `flowstate codebase hooks install`
4. If auto-fix fails:
   - Block task start
   - Report the failure to the user

### Done when

- Either: all checks pass and control returned
- Or: auto-fix applied and re-check passes
- Or: user informed of blocking failure

---

## Conventions

| Item | Convention |
|------|-----------|
| Trigger | Task execution Step 0 (before any work) |
| Blocking | Blocks on zero index; auto-fixes first |
| Non-blocking | Gateway unreachable is a warning only |
| Auto-fix | Runs sync + hooks install automatically |
| Status command | `flowstate codebase status --json` |

---

_Created: 2026-04-12_
