---
name: flowstate-cli-local-auth
description: Use when authenticating the flowstate CLI against a local FlowState instance (kong gateway at port 7080/8000), running agent inbox/conversation/MCP tool calls from inside an openclaw sidecar, or debugging "orgId not provided" / "Not authenticated" errors from a service-token agent - documents the `local` server profile layout, kong routing, and the orgId resolution chain
---

# CLI Local Instance Authentication

**Status:** Active
**Purpose:** How the flowstate CLI authenticates against a local FlowState instance using a service token, where credentials live, and how MCP tool calls are routed
**Scope:** All `flowstate <subcommand>` calls that target the local kong gateway (host or openclaw sidecar containers)
**Trigger:** Agent provisioning, agent-inbox / agent-conversation use, MCP tool calls from inside an openclaw container, debugging service-token auth errors

---

## Overview

The flowstate CLI keeps server profiles in `~/.flowstate/config.json` under `servers.<id>`. The `local` profile holds:

- A long-lived **service token** (HKDF-derived shared secret) used by the agent's openclaw sidecar to authenticate to its instance
- A short-lived **access token** (JWT) refreshed automatically on demand
- The agent's `orgId`, `userId` (service account id), and the kong base URLs

`mcpToolCall()` in the CLI reads the token from the active server, but `orgId` resolution falls back through a 3-level chain so service-token containers (no project config) still work.

```
~/.flowstate/config.json
└── servers.local
    ├── url:        http://kong:8000
    ├── mcpUrl:     http://kong:8000/mcp
    ├── authUrl:    http://kong:8000/auth/token
    └── auth
        ├── serviceToken    (HKDF secret, never expires)
        ├── accessToken     (JWT, ~1h TTL — auto-refreshes)
        ├── expiresAt       (ms epoch)
        ├── orgId           (canonical for the agent)
        ├── userId          (service account id, e.g. svc_v0wAU8WOi9)
        └── serviceAccountId
```

---

## Prerequisites

- A running FlowState local instance (kong, mcp-http, d1-worker containers up)
- The agent has been provisioned via `flowstate agent provision <name>` — this writes the service token to the config

If you see `No service token found for agent <name>` from the orchestrator, the agent's config is missing the `local` profile. Re-run `flowstate agent provision`.

---

## Where credentials live

| Location | Purpose |
| -------- | ------- |
| `~/.flowstate/config.json` (host) | Operator/CLI session |
| `<agent-volume>/config/.flowstate/config.json` | Agent's service-token config (host-mounted into sidecar at `/home/openclaw/.flowstate/config.json`) |
| `<agent-volume>/config/wallet/eth-private-key` | SAGA ETH wallet (only used by `flowstate cloud login --method wallet`, see `flowstate-cli-wallet-auth`) |

Inside the openclaw sidecar, the file is read-write at `/home/openclaw/.flowstate/config.json` so the CLI can refresh the access token. The agent's `agent.json` is read-only at `/agent/config/agent.json`.

---

## How `mcpToolCall()` resolves identity

The CLI's `mcpToolCall(toolName, params)` injects three pieces of identity into the MCP request body before sending:

| Field | Resolution order |
| ----- | ---------------- |
| `orgId` | 1. `params.orgId` (explicit) → 2. project `.flowstate/config.json` walk-up → 3. `servers.<active>.auth.orgId` |
| `workspaceId` | 1. `params.workspaceId` → 2. project `.flowstate/config.json` walk-up |
| `callerUserId` | `servers.<active>.auth.userId` |

The third orgId fallback is critical for **openclaw sidecars** — they have no project config in the workspace, so without it every CLI call fails with "orgId not provided and not present on teammember row".

---

## Kong routing (local instance)

```
flowstate CLI
   │  POST http://kong:8000/mcp/tools/<tool>
   │  Authorization: Bearer <accessToken>
   ▼
fs-default-kong
   │  /mcp/* → mcp-http:3100/tools/<tool>
   ▼
fs-default-mcp-http  (validates JWT, dispatches to MCP tool)
   │
   ▼
fs-default-d1-worker (REST writes / reads)
```

The container hostnames (`kong`, `mcp-http`, `d1-worker`) MUST be in `NO_PROXY` so the openclaw sidecar's overwatch HTTP proxy doesn't try to MITM internal traffic. See `flowstate-agent-cli-bootstrap` for the canonical NO_PROXY list.

---

## Quick reference

### Verify auth from inside an openclaw container

```bash
docker exec openclaw-agent-<slug> flowstate agent inbox <slug>
```

Expected: 4-section markdown (📋 tasks · 💬 mentions · ↩️ replies · 🗨️ conversations).

### Inspect the active session

```bash
jq '{
  active: .activeServerId,
  orgId: .servers.local.auth.orgId,
  userId: .servers.local.auth.userId,
  expiresAt: .servers.local.auth.expiresAt
}' ~/.flowstate/config.json
```

### Reset to local-only (after a cloud login that flipped active)

`flowstate cloud login` no longer changes `activeServerId` (since 2026-05-04). If an older session set it to `cloud-pay` or another id, switch it back:

```bash
flowstate server use local
flowstate server list   # verify "local" is now active
```

---

## Common errors

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `Error: agent-inbox returned non-JSON: Cannot build inbox for agent "<slug>": orgId not provided` | Project config missing AND server config orgId fallback not in CLI build | The openclaw container installs the CLI from npm via `npm install -g @epicdm/flowstate-cli@${FLOWSTATE_CLI_VERSION}` (PR #355). Bump `FLOWSTATE_CLI_VERSION` to a version that includes the `readRawServerConfig().orgId` fallback (≥ 1.1.0) and rebuild the openclaw image. Verify with `flowstate -V` inside the container. |
| `Error: fetch failed` from any `flowstate ...` call | Overwatch MITM intercepts kong/mcp-http traffic | Add `kong,mcp-http,d1-worker` to NO_PROXY (see `flowstate-agent-cli-bootstrap`) |
| `No server configured. Run "flowstate server add" first.` | `~/.flowstate/config.json` missing or has no `servers.local` | Re-run `flowstate agent provision <name>` to seed the file |
| `"exp" claim timestamp check failed` on a direct curl | Access token expired | Run any `flowstate ...` command — the CLI auto-refreshes via the `authUrl` |

---

## Cross-references

- `flowstate-agent-onboarding` — how `flowstate agent provision` creates the service token in the first place
- `flowstate-cli-cloud-auth` — adding a `cloud-pay` profile alongside `local` for production gateway access
- `flowstate-agent-cli-bootstrap` — composes local + cloud auth in openclaw sidecars
- `flowstate-cloud-gateway-routing` — when the CLI talks to production via `api.epicflowstate.ai` instead of kong

---

_Created: 2026-05-04_
