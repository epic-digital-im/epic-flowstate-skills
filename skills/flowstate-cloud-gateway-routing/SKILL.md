---
name: flowstate-cloud-gateway-routing
description: Use when calling FlowState Cloud APIs from the CLI, debugging 404 or 401 responses from `api.epicflowstate.ai`, configuring NO_PROXY for cloud egress, or building a new `flowstate cloud <service>` subcommand - documents the single-gateway architecture, path-prefix routing table, stripPath behavior, and the `x-org-id` header requirement
---

# Cloud Gateway Routing

**Status:** Active
**Purpose:** Reference for how the FlowState Cloud single-gateway architecture routes path-prefixed requests at `api.epicflowstate.ai` to upstream service workers
**Scope:** Every `flowstate cloud <service>` subcommand, every direct curl/fetch from an agent against production
**Trigger:** Building a cloud subcommand, debugging 404s, picking the right base URL in `cli-commands/cloud/production-urls.ts`

---

## Overview

**All FlowState Cloud API traffic flows through a single Cloudflare Worker gateway at `api.epicflowstate.ai`.** Per-service hostnames like `dojo-api.epicflowstate.ai` are NOT public addresses — they're Cloudflare internal service bindings. The CLI must always target the gateway base + a path prefix.

The gateway worker (`flowstate-platform/packages/worker-gateway`) reads the canonical route table from `flowstate-platform/packages/gateway-routes/src/routes.ts` and forwards requests to the matching upstream `*_API_SERVICE` binding.

```
flowstate CLI   ─────►  api.epicflowstate.ai  ─────►  upstream service worker
                          │ matches /dojo/*           DOJO_API_SERVICE
                          │ matches /marketplace/*    MARKETPLACE_API_SERVICE
                          │ matches /directory/*      DIRECTORY_API_SERVICE
                          │ matches /auth/*           AUTH_SERVICE
                          │ ...
                          │
                          │ stripPath: true → strips the prefix before forwarding
                          │ stripPath: false → preserves full path
```

---

## Route table (excerpt)

Canonical source: `flowstate-platform/packages/gateway-routes/src/routes.ts`. Selected highlights:

| Gateway path | Upstream | Auth | Strip prefix |
| ------------ | -------- | ---- | ------------ |
| `/dojo/*` | DOJO_API_SERVICE | jwt | yes |
| `/marketplace/openapi.json`, `/marketplace/listings`, `/marketplace/listings/*`, `/marketplace/templates`, `/marketplace/extensions/*`, `/marketplace/media/*` | MARKETPLACE_API_SERVICE | none (GET) | yes |
| `/marketplace/listings/*/install` | MARKETPLACE_API_SERVICE | none (POST) | yes |
| `/marketplace/developer/*` | MARKETPLACE_API_SERVICE | jwt | yes |
| `/marketplace/admin/*` | MARKETPLACE_API_SERVICE | jwt | yes (with `upstreamPrefix: /admin`) |
| `/marketplace/webhooks/*` | MARKETPLACE_API_SERVICE | none | yes |
| `/marketplace/cron/*` | MARKETPLACE_API_SERVICE | none | yes |
| `/directory/agents`, `/directory/companies` | DIRECTORY_API_SERVICE | none (GET) | yes |
| `/directory/*` | DIRECTORY_API_SERVICE | jwt | yes |
| `/dashboard/*` | DASHBOARD_API_SERVICE | jwt | yes |
| `/payments/*` | PAYMENT_API_SERVICE | varies | yes |
| `/auth/api/oauth/userinfo`, `/auth/me` | AUTH_SERVICE | jwt | no (preserves path) |
| `/auth/api/auth/wallet/challenge` (when added) | AUTH_SERVICE | none | no |
| `/.well-known/openid-configuration`, `/.well-known/jwks.json` | AUTH_SERVICE | none | no |
| `/auth/api/token/exchange`, `/auth/token`, `/auth/refresh` | AUTH_SERVICE | varies | no |

**`/dojo/*` is jwt-gated for everything** (no public GETs), so the dojo CLI requires a cloud-pay JWT.

---

## Path stripping

| Mode | Example |
| ---- | ------- |
| `stripPath: true` | Request `/dojo/courses/abc` arrives at DOJO_API_SERVICE as `/courses/abc` |
| `stripPath: false` | Request `/auth/me` arrives at AUTH_SERVICE as `/auth/me` (path preserved — auth owns its own namespace) |

When the upstream returns relative URLs (e.g. signed download links), those URLs **already include** the gateway prefix because the upstream doesn't know whether it's being reached directly or through the gateway. CLI helpers must dedupe — see `joinUrl()` in `packages/flowstate-cli/src/lib/marketplace-install.ts` for the canonical handling.

---

## Production URLs in the CLI

`packages/flowstate-cli/src/cli-commands/cloud/production-urls.ts`:

```ts
const GATEWAY_BASE = 'https://api.epicflowstate.ai'

export const PRODUCTION_URLS = {
  identity:      'https://id.epicflowstate.ai',     // Next.js app — wallet auth NOT yet via gateway
  identityApi:   `${GATEWAY_BASE}/auth`,            // gateway → AUTH_SERVICE
  dojo:          `${GATEWAY_BASE}/dojo`,            // gateway → DOJO_API_SERVICE
  directory:     `${GATEWAY_BASE}/directory`,       // gateway → DIRECTORY_API_SERVICE
  dashboard:     `${GATEWAY_BASE}/dashboard`,       // gateway → DASHBOARD_API_SERVICE
  marketplace:   `${GATEWAY_BASE}/marketplace`,     // gateway → MARKETPLACE_API_SERVICE
  epicflowstate: GATEWAY_BASE,                      // unprefixed routes (.well-known, /auth/me, etc.)
  pay:           `${GATEWAY_BASE}/payments`,        // gateway → PAYMENT_API_SERVICE (PR #354)
}
```

**One remaining exception to the gateway rule (temporary):**

1. **`identity`** — Next.js identity app at `id.epicflowstate.ai`. Wallet challenge/verify endpoints aren't in the gateway route table yet (`/auth/api/auth/wallet/challenge` is reserved but not routed). Wallet auth temporarily targets `id.*` directly. When the gateway adds wallet routes, this collapses to `GATEWAY_BASE`.

`pay.epicflowstate.ai` is a dead hostname — `flowstate-payment` worker has `workers_dev = false` and no `routes` block. As of PR #354 every `flowstate cloud *` command defaults `--api-url` to `${GATEWAY_BASE}/payments`. When the gateway adds wallet routes, `identity` collapses to `GATEWAY_BASE` too.

---

## NO_PROXY contract for agent containers

Openclaw sidecars route all egress through Overwatch (`HTTP_PROXY=http://overwatch:8080`). Cloud hosts (`api.epicflowstate.ai`, `id.epicflowstate.ai`) are NOT in the NO_PROXY allowlist — they DO go through Overwatch's MITM by design (egress audit + credential injection).

Since the Overwatch CA cleanup (PRs #356 / #357 / #358) the openclaw entrypoint fetches Overwatch's CA from the admin API at boot, fingerprint-verifies it against `/ca.json`, and installs it into the system trust store. Node's undici/fetch + curl + git all trust the MITM cert without any per-call workaround.

The orchestrator-injected NO_PROXY for the openclaw process covers internal-network hosts only:

```
localhost,127.0.0.1,flowstate-ai-gateway,kong,mcp-http,d1-worker,document-store,ams,obs-server,overwatch,${OVERWATCH_HOST},auth-server,connector,rag-sync,surrealdb,redis,minio,ollama
```

The legacy "add `api.epicflowstate.ai,id.epicflowstate.ai` per-call to bypass Overwatch" pattern from `flowstate-cli-wallet-auth` is no longer required for correctness. Keep it only when you specifically want a call to skip Overwatch's audit log (e.g. while debugging a Phase 5 audit-log gap).

---

## The `x-org-id` requirement on `/auth/me`

The gateway routes `/auth/me` to AUTH_SERVICE. The auth service requires an `x-org-id` header on every request because user identities are scoped per org:

```bash
curl -H "Authorization: Bearer $JWT" -H "x-org-id: $ORG" https://api.epicflowstate.ai/auth/me
```

The CLI's `mcpToolCall()` injects this header automatically (`flowstate-cli-local-auth` documents the resolution chain). Direct curl callers must add it manually.

---

## Quick reference

### Verify a route via curl

```bash
# Public read — no auth needed
curl -s https://api.epicflowstate.ai/marketplace/listings | jq '.listings | length'

# JWT-gated — needs cloud-pay token
TOKEN=$(jq -r '.servers["cloud-pay"].auth.accessToken' ~/.flowstate/config.json)
curl -s -H "Authorization: Bearer $TOKEN" https://api.epicflowstate.ai/dojo/courses

# JWKS — public
curl -s https://api.epicflowstate.ai/.well-known/jwks.json | jq '.keys[0].kid'
```

### Add a new gateway-routed CLI subcommand

1. Add the route to `flowstate-platform/packages/gateway-routes/src/routes.ts` (server-side PR)
2. Once deployed, update `packages/flowstate-cli/src/cli-commands/cloud/production-urls.ts` so the entry points at `${GATEWAY_BASE}/<service>`
3. Build the CLI client with the gateway base — DON'T hardcode the per-service hostname

---

## Common errors

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `404 Not Found` from `api.epicflowstate.ai/<service>/...` | Upstream worker doesn't have that route deployed yet | Verify the route exists in the upstream OpenAPI; if absent, the backend isn't shipped. Production dojo currently returns empty `paths` from `/dojo/openapi.json` — backend not yet deployed (2026-05-04). |
| `401 Missing Authorization header` on a route the docs say is public | The route table at deployment hasn't been refreshed with the canonical config | Server-side: re-deploy the gateway after `gateway-routes` changes |
| `"x-org-id header required"` from `/auth/me` | Direct curl without the header | Add `-H "x-org-id: <orgId>"` |
| Marketplace install returns wrong path (404) | `joinUrl()` double-prefixed `/marketplace` | Use the patched `joinUrl()` in `marketplace-install.ts` (PR #335 includes the fix) |
| `Error: fetch failed` from a cloud call | Overwatch MITM CA not trusted (boot-time install hard-failed silently) | Check `[install-overwatch-ca]` lines in the entrypoint logs; verify `OVERWATCH_HOST` resolves and `OVERWATCH_ADMIN_PORT` is reachable. As a last-resort fallback, add the host to NO_PROXY for that one call. |

---

## Cross-references

- `flowstate-cli-cloud-auth` — how the cloud-pay JWT gets minted in the first place
- `flowstate-cli-wallet-auth` — wallet endpoints currently bypass the gateway via `id.epicflowstate.ai`
- `flowstate-dojo-cli` / `flowstate-plugin-lifecycle` — concrete CLI subcommands that consume gateway routes
- `flowstate-agent-cli-bootstrap` — NO_PROXY config baked into the openclaw spawner

---

_Created: 2026-05-04_
