---
name: flowstate-dojo-agent-session
description: Use when an agent needs to authenticate, verify, or repair a shell session before using `flowstate cloud dojo`, especially in headless containers, worktrees, or after "Missing Dojo API token" / "Not authenticated" errors - provides Dojo-ready session setup and health checks
---

# Dojo Agent Session

**Status:** Active
**Purpose:** Prepare an agent shell to call production Dojo through the FlowState CLI
**Scope:** `flowstate cloud dojo *` commands from local workstations and openclaw sidecars
**Trigger:** Before Dojo CLI work, after auth errors, or before production smoke
**Output:** A verified cloud-pay session that can call `profile`, `tokens`, and basic list endpoints

---

## Overview

Dojo production calls use the `cloud-pay` server profile. Do not switch the active local server just to call Dojo.

```
Verify CLI -> Verify cloud-pay -> Login if needed -> Probe Dojo -> Continue workflow
```

---

## Step 1: Verify CLI and Config

```bash
flowstate --version
jq '.activeServerId, .servers["cloud-pay"].auth | {userId,email,expiresAt}' ~/.flowstate/config.json
```

Expected:

- `flowstate` exists on `PATH`
- `servers["cloud-pay"].auth.accessToken` exists
- `activeServerId` may remain `local`

Do not print access tokens in user-visible output.

---

## Step 2: Login When Needed

Interactive operator:

```bash
flowstate cloud login --method oauth
```

Headless agent with SAGA wallet:

```bash
flowstate cloud login \
  --method wallet \
  --wallet "$(cat /agent/config/wallet/eth-private-key)" \
  --identity-url https://id.epicflowstate.ai
```

If the environment has both local MCP auth and cloud auth, keep them as separate profiles:

- Local instance commands: `flowstate agent ...`
- Production Dojo commands: `flowstate cloud dojo ...`

---

## Step 3: Health Checks

Run these before mutating Dojo data:

```bash
flowstate cloud dojo profile --json | jq -e '.id and .userId'
flowstate cloud dojo tokens --json | jq -e 'has("balance")'
flowstate cloud dojo courses list --limit 1 --json | jq -e 'has("data")'
```

If any command fails:

1. Re-run `flowstate cloud login`.
2. Check gateway route health:

   ```bash
   curl -sS https://api.epicflowstate.ai/dojo/openapi.json | jq '.openapi, (.paths | length)'
   ```

3. If OpenAPI is missing expected paths, this is a deployed service issue, not a CLI auth issue.

---

## Error Handling

| Error | Action |
| ----- | ------ |
| `Missing Dojo API token` | Run `flowstate cloud login`; use `flowstate cloud dojo`, not bare `flowstate dojo` |
| `Not authenticated with FlowState Cloud` | Token missing/expired; login again |
| `fetch failed` | Check proxy/CA setup; in openclaw, use `flowstate-agent-cli-bootstrap` |
| `401` from `/dojo/*` | Confirm command used `cloud dojo` and `cloud-pay` token exists |
| `403` on writes | Caller lacks ownership/admin/member permission |

---

## Done When

- `profile`, `tokens`, and `courses list` return JSON successfully.
- The workflow skill for the user's task can proceed.

---

_Created: 2026-05-14_
