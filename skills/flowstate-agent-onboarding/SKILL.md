---
name: flowstate-agent-onboarding
description: Use when an OpenClaw agent (or operator) needs to provision and start a new FlowState agent end-to-end via the flowstate CLI — covers sync, service-account provisioning, device key, model routing, and sidecar lifecycle. D1 teammembers.slug is the source of truth.
---

# Agent Onboarding

**Status:** Active (updated 2026-05-03 for post-PR-287 zero-touch onboarding)
**Purpose:** Walk an operator (human or OpenClaw agent) through every step of bringing a new FlowState agent online — from a bare `.flowstate/agents/<slug>.json` definition to a running OpenClaw sidecar that can be chatted with. After the 2026-05-02 PR chain (#272 #275 #278 #279 #280 #285 #286 #287), the 6-step flow runs without manual SQL or config injection — the architecture is clean end-to-end.
**Scope:** Per-agent provisioning. Does NOT cover instance bootstrap (`flowstate start`), authentication (`flowstate login`), or vault setup — those are preconditions.
**Trigger:** Onboarding a brand-new agent OR recovering an agent that's been removed from D1.

---

## Source of truth (read this first)

```
D1 teammembers collection IS the runtime source of truth for agent identity.
Local files (.flowstate/agents/*.json, .claude/agents/*.md) are generated
or definition artifacts — they bootstrap D1 via `flowstate sync-agents`,
but no agent CLI command reads them at runtime.

Lookup happens by `teammembers.slug`, not by filename, not by .md frontmatter.
```

Implications:
- An agent only "exists" once it has a row in `teammembers` with `isAgent=1` and a `slug`.
- The `slug` matches the `name` field in `.flowstate/agents/<slug>.json`.
- Vault items + 1Password vault hold secrets (API keys, device private keys). D1 holds metadata.
- After PR #272 + #275: `resolveAgentRecord` queries `teammembers` by slug-only selector and filters `isAgent`/`_deleted` TS-side (workaround for an rxdb-d1 REST combined-selector bug).

---

## Preconditions

Before you can run any of the steps below, the following must be true:

1. **Instance is running**: `flowstate status default` shows kong, d1-worker, auth-server, mcp-http, agent-orchestrator, flowstate-ai-gateway as healthy.
2. **You're logged in to the active server** with a user JWT that includes `admin` and `operator.write` scopes:
   ```
   flowstate login                    # NOT cloud login — that's a different server profile
   ```
   Verify scopes with the JWT decode pattern in `flowstate-runbooks-multi-provider-ai-gateway` (or just attempt `flowstate agent list` — if it returns 0 rows, your token is wrong).
3. **Vault is unlocked** (only required for device-key + secret writes):
   ```
   flowstate vault unlock             # interactive password prompt
   flowstate vault status             # confirm "unlocked"
   ```
4. **Project config has the right org/workspace**: `.flowstate/config.json` must have `orgId` + `workspaceId` matching where teammembers live. The CLI auto-injects both into every MCP query — a mismatch returns 0 rows even when the slug exists.
5. **The agent definition file exists** at `.flowstate/agents/<slug>.json`. The `name` field in that JSON becomes the `slug` in D1. See existing files for shape (e.g. `ceo.json`, `cto.json`).

---

## The 6-step onboarding flow

```
sync-agents → status → provision → provision-device-key → set-model → start
```

Each step is idempotent — re-running is safe.

### Step 1: Sync local definitions to D1

Pushes `.flowstate/agents/*.json` files into the `teammembers` collection. Creates new rows for new agents, updates existing rows for changed content. Sets `slug` on insert.

```bash
# Always dry-run first to preview
flowstate sync-agents --dry-run

# Apply (default direction is local-to-remote)
flowstate sync-agents
```

**Verify:**
```bash
flowstate agent status <slug>
# Expected:  Agent <userName> (team_xxx)
#            Container: stopped (no heartbeat)   ← new agent has never run
```

If `agent status` errors with `Agent slug "<slug>" not found`, sync didn't insert (or inserted into a different workspace — re-check `.flowstate/config.json`).

### Step 2: Provision (service account + SAGA + wallet + workspace files + chatOnly flag)

Creates the agent's **service account** (machine identity for orchestrator-issued tokens), generates **wallet keys** (ETH + Solana), creates a **SAGA identity document**, writes per-agent secrets to the **OpenClaw vault** in the agent's home directory, **renders the 6 workspace markdown files** from teammember metadata, and **sets `metadata.chatOnly=true`** so the orchestrator takes the openclaw-only spawn path.

```bash
flowstate agent provision --name <slug>
```

**Required env (or flags):**
- `FLOWSTATE_AGENTS_OP_SERVICE_ACCOUNT` — 1Password service account token (for storing wallet keys + ANTHROPIC_API_KEY). The OP CLI must already be authenticated.
- Vault password (interactive prompt) OR `--vault-service-token <token>`.

**What this writes (post-PR-287):**
| Target | What |
|---|---|
| `teammembers.metadata` (D1) | `serviceAccountId`, `walletAddress`, `walletChain`, `solanaAddress`, `sagaDocumentId`, `provisionedAt`, `chatOnly: true`, `openclawConfig` (gateway + channels + models default) |
| 1Password vault `flowstate-agents` | Per-agent item with ANTHROPIC_API_KEY, ETH/SOL keys, service-account secrets |
| `volumes/agents/<slug>/.env` | Agent's home-mounted env file (orchestrator reads this on sidecar spawn) |
| `volumes/agents/<slug>/openclaw-data/workspace/IDENTITY.md` | Name, role, email, vibe, emoji from teammember metadata |
| `volumes/agents/<slug>/openclaw-data/workspace/SOUL.md` | Backstory, instructions, RACI, operating principles (instructions read from `extended.agent.instructions`) |
| `volumes/agents/<slug>/openclaw-data/workspace/USER.md` | Org context + agent's IDs (orgId, workspaceId from `teammembers` top-level columns) |
| `volumes/agents/<slug>/openclaw-data/workspace/TOOLS.md` | flowstate CLI patterns + agent's IDs interpolated |
| `volumes/agents/<slug>/openclaw-data/workspace/AGENTS.md` | Team coordination handshake + directReports list |
| `volumes/agents/<slug>/openclaw-data/workspace/HEARTBEAT.md` | Periodic self-check prose (role-specific) |

(REPOS.md is **not** written by provision — the openclaw entrypoint owns it via heredoc on every boot. Single source of truth.)

**One-time output to capture:** the provision step prints `SERVICE TOKEN SECRET (save this — shown only once): <token>`. This is the agent's service-account JWT. The agent's sidecar reads it from the vault later, but if you need to bootstrap from scratch (e.g., agent runs CLI inside its own container), grab the token here.

**Verify:**
```bash
flowstate agent status <slug>
# Expected:  Provisioned: yes

ls volumes/agents/<slug>/openclaw-data/workspace/
# Expected:  AGENTS.md  HEARTBEAT.md  IDENTITY.md  SOUL.md  TOOLS.md  USER.md
```

### Step 3: Provision device key

Generates an **Ed25519 keypair** for OpenClaw's connect-frame authentication. The public key gets a `deviceId = SHA-256(rawPublicKey)` which the gateway pins; the private key is stored in the OpenClaw vault.

```bash
flowstate agent provision-device-key --name <slug>
```

**What this writes:**
| Target | What |
|---|---|
| `teammembers.metadata.openclawDeviceIdentity` (D1) | `{ deviceId, publicKeyPem, privateKeyPem }` (legacy path; vault read takes priority) |
| OpenClaw vault | Same `{ deviceId, publicKeyPem, privateKeyPem }` (preferred path; `chat` reads from here) |

**Important:** The vault must be unlocked. If not, the command falls back to writing the private key into D1 metadata (which is the legacy/fallback path). Always run `flowstate vault unlock` first.

**Verify:**
```bash
flowstate agent status <slug>
# Expected:  Device Key: <hex deviceId>
```

### Step 4: Set the agent's model

Configures `models.default` (the pi-ai-known Anthropic-shape source) and optionally `models.routeModel` (per-request route swap target). The orchestrator reads this on the next reconcile and injects `FLOWSTATE_SOURCE_MODEL` + `FLOWSTATE_ROUTE_MODEL` into the sidecar env.

```bash
# Pure Anthropic — pi-ai talks directly to claude-haiku-4-5
flowstate agent set-model <slug> --primary anthropic/claude-haiku-4-5

# Anthropic→OpenAI route swap — gateway translates shape, gpt-5.5 upstream
flowstate agent set-model <slug> --primary openai/gpt-5.5 \
  --fallback anthropic/claude-haiku-4-5
```

**Format:** `--primary <provider>/<model>`. Provider is `anthropic` or `openai`. The model slug must exist in `packages/ai-gateway-core/src/cost/prices.ts` — if the price entry is missing, set-model errors out before any write.

**What this writes:**
- `teammembers.metadata.openclawConfig.models = { default, fallback?, routeModel? }` (D1)

**Verify:**
```bash
flowstate agent get-model <slug>
flowstate agent get-model <slug> --json   # machine-readable
```

### Step 5: Start the sidecar

Flips `containerEnabled=true` and wakes the orchestrator's reconcile loop. The orchestrator pulls the latest config, renders `openclaw.json` (from `metadata.openclawConfig`), and `docker run`s the OpenClaw sidecar with the agent's bind mounts + env.

```bash
flowstate agent start <slug>
```

Expected output:
```
  resolved <slug> → team_xxx
  ✓ device key present
  ✓ containerEnabled=true
  ✓ orchestrator woken (queued)
  ✓ container running (Ns)
```

**Verify:**
```bash
docker ps --filter name=openclaw-agent-<slug>
# Expected:  Up Ns (healthy)

flowstate agent status <slug>
# Expected:  Container: running (heartbeat <Ns> ago)
#            Chat: ws://<host>:<port>/agents/team_xxx/chat
```

### Step 6: Connect via chat

```bash
flowstate agent chat <slug> --new          # new conversation
flowstate agent chat <slug> --timeout 600  # resume / longer budget
```

The CLI authenticates over WebSocket using **device-path** (signed connect frame with the Ed25519 private key from the vault). If the vault is locked, it falls back to the trusted-proxy `authToken` path which OpenClaw's `server.impl` strips scopes from and rejects with `WS_CONNECT_FAILED: missing scope: operator.write`. Always unlock the vault before chat.

---

## Pre-PR-287 vs current behavior

Earlier in 2026-05-02 the sync + provision pipeline had several gaps that required manual SQL to work around. **These are all closed in current `dev`** — left here as historical context only:

| Gap | Closed in PR | What was wrong | What's right now |
|---|---|---|---|
| sync-agents wrote `slug=NULL` | #278 + #280 | Drizzle schema had slug but no migration; create payload didn't include it | Migration 0015 + create payload sets slug from `agent.config.name` kebab-cased |
| sync-agents wrote wrong `workspaceId` | #278 | Manager only took orgId; no workspaceId param | Reads `workspaceId` from project `.flowstate/config.json`; fallback to CLI context |
| sync-agents update-path didn't backfill slug | #278 | Update path skipped slug field | Now writes `slug` on update if absent |
| `provision` didn't write `openclawConfig` | #286 | Set-model failed with "no openclawConfig" | Writes default openclawConfig (gateway + channels + models) on first provision |
| `provision` didn't pre-create workspace `.md` files | #287 | Sidecar entrypoint crashed with `ENOENT` on `IDENTITY.md` write | Writes 6 files (IDENTITY/SOUL/USER/TOOLS/AGENTS/HEARTBEAT) at provision time, populated from teammember metadata + `extended.agent` |
| `provision` didn't set `metadata.chatOnly` | #287 | Manual-spawn fell back to legacy worker container | Sets `chatOnly=true`; orchestrator manual-spawn path also gates on `useLegacyAgentContainer() ? legacy : openclaw-only` |
| openclaw entrypoint didn't `mkdir -p workspace` | #287 | ENOENT on first boot for fresh agents | Entrypoint mkdirs workspace dir before any write |
| Orchestrator restart lost openclaw-only registry state | #286 | Pass 2 missed running openclaw sidecars without worker | Pass 2 scans for orphan openclaw containers, creates chatOnly registry entry |

**Net effect today (2026-05-03):** `flowstate sync-agents --agent <slug>` followed by `flowstate agent provision --name <slug>` produces an agent ready to start. No manual SQL. No manual config injection.

If you're working with an agent that was provisioned BEFORE these PRs landed (CEO, CTO, qa-engineer, automation-engineer), the legacy state may include NULL slug / wrong workspaceId / missing openclawConfig fields — apply the manual fixes documented in section "Recovery scenarios" below. Fresh agents going forward don't need them.

---

## Recovery scenarios

### "Agent slug X not found"

The runtime can't find a row with `slug=X` in `teammembers` (org-scoped to the active workspace). Cause is one of:

1. **Never synced**: `.flowstate/agents/<slug>.json` exists but D1 doesn't have a row. Run `flowstate sync-agents`.
2. **Wrong workspace**: row exists but `workspaceId` doesn't match `.flowstate/config.json`. Inspect with the cloud MCP; if you find a row in a different workspace, update `workspaceId` to match.
3. **Slug never set**: row exists with `isAgent=1` but `slug` is NULL (pre-PR-272 record). Run the backfill:
   ```bash
   yarn workspace @epicdm/flowstate-cli backfill:slug --db-path <d1.sqlite> --dry-run
   yarn workspace @epicdm/flowstate-cli backfill:slug --db-path <d1.sqlite>
   ```

### "Vault must be unlocked"

```bash
flowstate vault unlock
# enter password
```

Vault auto-locks after `flowstate stop`/`start` cycles. Always re-unlock before any provisioning or chat.

### "missing scope: operator.write"

Two possible causes:
1. JWT lacks `operator.write` scope (your email domain isn't in `ADMIN_EMAIL_DOMAINS` env). Check `flowstate auth` and re-login if needed.
2. Vault locked → CLI fell back to `authToken` path → OpenClaw stripped scopes. `flowstate vault unlock` then re-chat.

### Sidecar fails to spawn

Check orchestrator logs:
```bash
docker logs fs-default-agent-orchestrator --tail 30
```

Common: `containerEnabled disabled` (agent was stopped) → `flowstate agent start <slug>`. Or vault unlock issue → see above.

### Model routing not taking effect

Inspect the live sidecar env:
```bash
docker inspect openclaw-agent-<slug> --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep FLOWSTATE_
```

Expected for OpenAI route swap:
```
FLOWSTATE_ROUTE_MODEL=openai/gpt-5.5
FLOWSTATE_SOURCE_MODEL=anthropic/claude-haiku-4-5-20251001
```

If `ROUTE_MODEL` is missing, `set-model` didn't reach D1 OR drift detection hasn't reconciled yet (gives up after ~30s). Force restart with `flowstate agent stop <slug> && flowstate agent start <slug>`.

Verify the gateway log shows the right adapter:
```bash
docker logs fs-default-flowstate-ai-gateway --tail 5
# Expected line shape after a chat request:
# [ai-gateway] cloudflare-ai-gateway-openai gpt-5.5 agent=<slug> in=N out=N usd=N status=200
```

---

## Running this from inside an OpenClaw container

The OpenClaw image ships with the `flowstate` CLI binary at `/usr/local/bin/flowstate`. Inside a sidecar:

1. The CLI's auth context is the **service account JWT** the orchestrator injected (not a user JWT). Verify:
   ```bash
   flowstate auth
   ```
2. The active server profile is the local instance (`http://flowstate-ai-gateway:7000` is the gateway; the API server is reached via Kong at the orchestrator's configured URL). Don't `flowstate cloud login` — that targets the production identity server.
3. To onboard a new agent from inside CEO's sidecar:
   ```bash
   # Sidecar must already have a JSON definition for the new agent — write it
   # to the project's .flowstate/agents/ directory (the orchestrator's
   # working directory mount, NOT the sidecar's own /agent/workspace).
   cat > /workspace/.flowstate/agents/qa-bot.json <<'EOF'
   { ... agent-template.json shape ... }
   EOF
   
   flowstate sync-agents
   flowstate agent provision --name qa-bot
   flowstate agent provision-device-key --name qa-bot
   flowstate agent set-model qa-bot --primary anthropic/claude-haiku-4-5
   flowstate agent start qa-bot
   flowstate agent chat qa-bot --new
   ```

**Permissions caveat:** the sidecar's service-account JWT must have `admin` + `operator.write` scopes for provision/start/chat. Service accounts bound to `orchestrator-sa` already have these; per-agent service accounts may not. If a per-agent SA can't onboard others, that's by design — only operator/orchestrator identities should onboard.

---

## CLI quick reference

| Command | Purpose |
|---|---|
| `flowstate sync-agents` | Push `.flowstate/agents/*.json` → D1 (sets slug on insert) |
| `flowstate sync-agents --dry-run` | Preview without writes |
| `flowstate agent list` | List all `isAgent=1` rows in active workspace |
| `flowstate agent status <slug>` | Container/heartbeat/endpoint state |
| `flowstate agent provision --name <slug>` | Service account + wallet + SAGA + vault items |
| `flowstate agent provision-device-key --name <slug>` | Ed25519 keypair → vault |
| `flowstate agent set-model <slug> --primary <provider/model>` | Configure model routing |
| `flowstate agent get-model <slug>` | Show current routing |
| `flowstate agent start <slug>` | `containerEnabled=true` + wake orchestrator |
| `flowstate agent stop <slug>` | `containerEnabled=false` |
| `flowstate agent chat <slug> --new` | New conversation over WebSocket |
| `flowstate agent saga-export --name <slug>` | Export SAGA identity doc |

---

## Iron rules

```
1. NEVER read .claude/agents/<slug>.md to find a teamMemberId at runtime.
   D1 teammembers.slug is the only source of truth for agent identity.

2. NEVER hardcode a teamMemberId in CLI args. Always pass --name <slug>.
   IDs are stable but slugs are the human-readable handle.

3. ALWAYS unlock the vault before provision-device-key OR chat OR
   any command that signs / reads device keys.

4. ALWAYS run sync-agents --dry-run first when bulk-syncing > 5 agents.
   The local-to-remote direction can update existing rows; preview first.

5. NEVER edit .claude/agents/<slug>.md by hand. Generated by
   ClaudeAgentGenerator from teammembers data; edits are clobbered on
   next sync.
```

---

## Reference

- `packages/flowstate-cli/src/cli-commands/agent/utils/lifecycle.ts:resolveAgentRecord` — slug lookup helper
- `packages/flowstate-cli/src/lib/agent-sync/AgentSyncManager.ts` — local↔D1 reconciler
- `packages/flowstate-cli/src/lib/agent-workspace/templates.ts` — 7 workspace markdown renderers + `writeWorkspaceFiles`
- `packages/flowstate-cli/src/cli-commands/agent/provision.ts` — service account + wallet + workspace files + chatOnly
- `packages/flowstate-cli/src/cli-commands/agent/provision-device-key.ts` — Ed25519 keypair
- `packages/flowstate-workers/src/orchestrator/agent-orchestrator.ts` — sidecar spawn (Pass 1 auto + Pass 2 manual, both gated on `useLegacyAgentContainer() && hasOpenClaw`)
- `packages/flowstate-workers/src/orchestrator/openclaw-spawner.ts` — sidecar env injection
- `packages/flowstate-workers/src/orchestrator/config-renderer.ts` — `openclaw.json` writer
- `packages/flowstate-rxdb-d1/migrations/0015_teammembers_slug.sql` — slug column migration
- `docker/scripts/openclaw-entrypoint.sh` — workspace dir mkdir + REPOS.md heredoc + IDENTITY/SOUL/USER inline render fallback
- `docs/runbooks/2026-05-01-multi-provider-ai-gateway.md` — model routing operator guide
- PRs #272, #275, #278, #279, #280, #285, #286, #287 — full architecture + operational fix chain (2026-05-02)

---

## Verification checklist (for a fresh agent)

After running all 6 steps, ALL of these should succeed:

```bash
flowstate agent status <slug>                                            # Container running, heartbeat fresh, device key present
docker ps --filter name=openclaw-agent-<slug>                            # Up (healthy)
docker inspect openclaw-agent-<slug> --format '{{.Config.Env}}' \
  | grep -E "FLOWSTATE_(SOURCE|ROUTE)_MODEL"                             # Env set correctly
flowstate agent get-model <slug>                                         # Model + provider
echo "say hello" | flowstate agent chat <slug> --new --timeout 60        # 200 response
docker logs fs-default-flowstate-ai-gateway --tail 1                     # Ledger row attributed to <slug>
```

If all 6 pass, the agent is fully operational.

---

## Step 7 — Verify the Agent Inbox surface

Once the agent has booted and `flowstate agent status <slug>` reports `running`, confirm the inbox endpoint resolves cleanly:

```bash
flowstate agent inbox <slug>
```

Expected on a fresh agent:

```
📥 Inbox for <slug> (<userName>) — last 7 days · generated <timestamp>

📋 Active tasks (0)
  (none)

💬 Mentions (0)
  (no mentions in window — mention indexing started 2026-05-03; older discussions are not retroactively indexed)

↩️ Replies (0)
  (none)
```

The forward-only disclosure under "Mentions" is expected and informational — it disappears once a real `@<slug>` mention shows up.

If this command returns:

- **`Agent slug "X" not found in teammembers collection`** — the slug isn't in D1 yet. Run `flowstate agent sync` and retry.
- **`is not flagged isAgent=true`** — slug collides with a human teammember. Either change the slug or update the row.
- **`tool not found: agent-inbox`** — the mcp-http container hasn't been rebuilt with the new tool. See `docs/runbooks/2026-05-03-agent-inbox-deployment.md` step 4 in the `epic-flowstate-community` repo.
- **`command not found: inbox`** — the CLI hasn't been rebuilt. Run `yarn nx build @epicdm/flowstate-cli --skip-nx-cache`.

### Teach the agent about its inbox

Inject the following snippet into the agent's bootstrap prompt (or the project's `CLAUDE.md` if applicable) so the agent uses the inbox on each heartbeat instead of chaining multiple `collection-query` calls:

```
You have access to a single MCP tool that returns your active workload:

  mcp__epic-flowstate__agent-inbox { "slug": "<your-slug>" }

Returns:
  - `tasks`: tasks assigned to you in {Planned, In Progress}
  - `mentions`: discussions in the last 7 days where someone wrote `@<your-slug>`
  - `replies`: replies on threads you authored OR replies that mention you

Call this tool first when figuring out what to work on. Do NOT chain
multiple collection-query calls for the same purpose.
```

This is also captured in the user guide at `docs/guides/agent-inbox-user-guide.md` (epic-flowstate-community repo).
