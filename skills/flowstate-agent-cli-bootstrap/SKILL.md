---
name: flowstate-agent-cli-bootstrap
description: Use when configuring a flowstate CLI session inside an openclaw agent sidecar so both the local instance MCP and the FlowState Cloud APIs work in the same container, debugging "Error: fetch failed" on agent-inbox or cloud-login, or building a new container env that runs the CLI - composes the local-auth, cloud-auth, and gateway-routing skills with the canonical NO_PROXY allowlist and config layout
---

# Agent CLI Bootstrap (Dual-Auth Inside an Openclaw Sidecar)

**Status:** Active
**Purpose:** Compose the local-instance + cloud auth flows so a single agent container can run `flowstate agent inbox`, `flowstate agent conversation`, `flowstate cloud login`, and `flowstate cloud dojo *` in the same shell session
**Scope:** Every openclaw sidecar provisioned by `flowstate-agent-orchestrator` and any equivalent container that bakes the flowstate CLI
**Trigger:** Onboarding a new agent, debugging "fetch failed" errors, building / rebuilding the openclaw image

---

## Overview

An openclaw sidecar must support TWO independent auth surfaces simultaneously:

1. **Local instance** via the kong gateway at `http://kong:8000` using a service token stored in `~/.flowstate/config.json` `servers.local.auth.serviceToken`
2. **FlowState Cloud** via the production gateway at `https://api.epicflowstate.ai` using a wallet-derived JWT stored in `servers["cloud-pay"].auth.accessToken`

These coexist with `activeServerId: "local"` (default). `flowstate <subcommand>` reads `local`; `flowstate cloud <subcommand>` reads `cloud-pay` by id. Neither breaks the other.

```
~/.flowstate/config.json (inside container)
├── activeServerId: "local"
└── servers
    ├── local
    │   └── auth (serviceToken + accessToken — instance MCP)
    └── cloud-pay
        └── auth (JWT minted by id.epicflowstate.ai/api/auth/wallet/verify)
```

---

## How the CLI binary lands in the container

The openclaw image installs the CLI from npm at build time (PR #355):

```dockerfile
ARG FLOWSTATE_CLI_VERSION=1.1.1
RUN npm install -g @epicdm/flowstate-cli@${FLOWSTATE_CLI_VERSION}
```

The legacy "build from monorepo source" flow (`yarn install` + `yarn nx build @epicdm/flowstate-cli` then mount `/opt/flowstate-cli`) is no longer used. To pick up a new CLI version, bump `FLOWSTATE_CLI_VERSION` and rebuild the openclaw image; verify with `docker exec openclaw-agent-<slug> flowstate -V`.

---

## Required container env (set by the orchestrator)

`packages/flowstate-workers/src/orchestrator/openclaw-spawner.ts` injects:

| Env | Value | Why |
| --- | ----- | --- |
| `FLOWSTATE_SERVICE_TOKEN` | the agent's service token | Backstop for the `local` profile if config gets wiped |
| `HTTP_PROXY` | `http://overwatch:8080` | Egress observability/firewall |
| `HTTPS_PROXY` | `http://overwatch:8080` | Same |
| `NO_PROXY` | (see below) | Hosts that bypass Overwatch |
| `OPENCLAW_CONFIG_PATH` | `/agent/config/openclaw.json` | Openclaw runtime config |
| `FLOWSTATE_REST_URL` | `http://kong:8000` | Local kong base |
| `FLOWSTATE_MCP_URL` | `http://kong:8000/mcp` | Local MCP base |
| `FLOWSTATE_AUTH_URL` | `http://kong:8000/auth/token` | Local auth refresh |

### Canonical NO_PROXY allowlist

The orchestrator sets:

```
localhost,127.0.0.1,flowstate-ai-gateway,kong,mcp-http,d1-worker,document-store,ams,obs-server,overwatch,auth-server,connector,rag-sync,surrealdb,redis,minio,ollama
```

This covers every internal FlowState service hostname so CLI fetches don't go through Overwatch's MITM. Production cloud hosts (`api.epicflowstate.ai`, `id.epicflowstate.ai`) are NOT in the bypass list and DO flow through Overwatch — that's the design. The Overwatch CA cleanup (PRs #356 / #357 / #358 / #360) makes this transparent: the openclaw entrypoint fetches Overwatch's CA at boot from `http://${OVERWATCH_HOST}:${OVERWATCH_ADMIN_PORT}/ca.crt`, verifies the SHA-256 fingerprint against `/ca.json`, and installs it into the system trust store before any outbound HTTPS fires. Node's undici/fetch + curl + git all trust it. There is no per-call `NO_PROXY=…` / `HTTPS_PROXY=""` workaround anymore. The Phase 5 smoke (`scripts/smoke/overwatch-egress.ts`) catches regressions in this contract in CI.

---

## Mounted paths inside the container

| Container path | Source (host) | Mode | Purpose |
| -------------- | ------------- | ---- | ------- |
| `/agent/config/openclaw.json` | `<volumes>/agents/<name>/config/openclaw.json` | ro | Openclaw runtime config |
| `/agent/config/agent.json` | `<volumes>/agents/<name>/config/agent.json` | ro | Agent definition (slug, instructions, tools, permissions) |
| `/agent/config/saga/identity.json` | `<volumes>/agents/<name>/config/saga/identity.json` | ro | SAGA identity (public wallet address) |
| `/agent/config/wallet/eth-private-key` | `<volumes>/agents/<name>/config/wallet/eth-private-key` | ro | SAGA wallet private key (mode 0600 on host) |
| `/agent/workspace` | `<volumes>/agents/<name>/workspace` | rw | Agent's working dir |
| `/home/openclaw/.flowstate/config.json` | `<volumes>/agents/<name>/config/.flowstate/config.json` | rw | CLI config (refreshable) |
| `/home/openclaw/.openclaw` | `<volumes>/agents/<name>/openclaw-data` | rw | Openclaw runtime data |

---

## Bootstrap sequence (operator-facing)

```bash
# 1. Provision (creates SAGA wallet + service token; one-time)
flowstate agent provision <name>

# 2. Start (orchestrator spawns the openclaw sidecar)
flowstate agent start <name>

# 3. Verify local CLI works inside the container
docker exec openclaw-agent-<name> flowstate agent inbox <name>
#   → Markdown with 4 sections (📋 / 💬 / ↩️ / 🗨️)

# 4. (Optional) bootstrap cloud-pay via wallet
#    The CA is installed at boot, so this call goes through Overwatch
#    without any per-call NO_PROXY / HTTPS_PROXY="" override.
docker exec openclaw-agent-<name> \
  flowstate cloud login --method wallet \
    --wallet "$(docker exec openclaw-agent-<name> cat /agent/config/wallet/eth-private-key)" \
    --identity-url https://id.epicflowstate.ai

# 5. Verify dual-session
docker exec openclaw-agent-<name> bash -c '
  echo activeServerId: $(jq -r .activeServerId /home/openclaw/.flowstate/config.json)
  echo profiles: $(jq -rc ".servers | keys" /home/openclaw/.flowstate/config.json)
  flowstate agent inbox <name>   # local works
  flowstate cloud dojo profile   # cloud works
'
```

---

## Smoke-test e2e (verified 2026-05-04)

| Step | Result |
| ---- | ------ |
| `flowstate agent inbox ceo` (local kong) | ✅ 4-section markdown rendered |
| `flowstate cloud login --method wallet` (with NO_PROXY bypass) | ✅ user `eg6xE11kHUdmZDkpEbQ-` returned |
| `activeServerId` after cloud login | ✅ stayed `local` |
| Both `local` AND `cloud-pay` profiles in config | ✅ |
| `flowstate agent inbox ceo` AFTER cloud login (regression) | ✅ still works |
| `GET /marketplace/listings` via gateway | ✅ 5 listings returned |
| `flowstate plugin create / build / install` | ✅ full local lifecycle |
| `flowstate plugin enroll` (publisher signup) | ⚠️ 403 — server-side enrollment workflow incomplete |
| `flowstate cloud dojo profile` | ⚠️ 404 — production dojo backend not yet deployed |

---

## When dual-auth fails — debug order

1. **`flowstate agent inbox` returns "fetch failed"** → check NO_PROXY includes `kong` and `mcp-http`
2. **`flowstate agent inbox` returns "orgId not provided"** → CLI build is too old (missing `serverCfg.orgId` fallback in `mcp-utils.ts`); rebuild from a commit ≥ `73454a4d`
3. **`flowstate cloud login --method wallet` fails with "fetch failed"** → add `id.epicflowstate.ai` to NO_PROXY
4. **`flowstate cloud dojo profile` fails with 401** → cloud-pay JWT expired; re-run `flowstate cloud login`
5. **`flowstate cloud dojo profile` fails with 404** → production dojo backend stub; not your fault, server-side rollout pending
6. **Container fails to start with "No service token found"** → orchestrator can't resolve the service token from `servers.local.auth.serviceToken`; the post-PR-335 fallback chain reads `local` first, then active, then any profile. If `local` was deleted, re-run `flowstate agent provision`.

---

## Red flags — STOP

- Setting `HTTPS_PROXY=""` anywhere — defeats Overwatch's egress audit + credential injection. The CA is trusted at boot, so there's no reason to bypass.
- Storing the wallet private key in the agent's `.env` or in any logged location
- `op read` of the wallet private key on the host shell — see MEMORY.md `feedback_no_host_shell_secret_reads.md`
- Flipping `activeServerId` to `cloud-pay` (breaks `flowstate agent inbox` and orchestrator service-token resolution if you also have a stale config)

---

## Cross-references

- `flowstate-cli-local-auth` — local profile structure and resolution chain
- `flowstate-cli-cloud-auth` — cloud-pay profile lifecycle
- `flowstate-cli-wallet-auth` — wallet eth-login specifics
- `flowstate-cloud-gateway-routing` — what cloud calls hit and how
- `flowstate-dojo-cli` / `flowstate-plugin-lifecycle` — the actual CRUD flows that depend on this bootstrap

---

_Created: 2026-05-04_
