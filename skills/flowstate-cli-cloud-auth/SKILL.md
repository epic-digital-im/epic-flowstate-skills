---
name: flowstate-cli-cloud-auth
description: Use when authenticating the flowstate CLI against the FlowState Cloud production gateway, choosing between OAuth (browser) and wallet (eth-login) methods, debugging "Missing Dojo API token" / "Not authenticated" errors after a successful cloud login, or operating local + cloud sessions in parallel - documents the `cloud-pay` server profile, the dual-session model, and how `flowstate cloud *` subcommands resolve their JWT
---

# CLI Cloud Authentication

**Status:** Active
**Purpose:** Authenticate the flowstate CLI against the production cloud gateway and store the resulting JWT in a way that coexists with any active local-instance session
**Scope:** All `flowstate cloud login` invocations and every `flowstate cloud <service>` subcommand that needs a JWT
**Trigger:** Need to call marketplace, dojo, directory, or pay APIs from the CLI; need to operate cloud + local in parallel

---

## Overview

`flowstate cloud login` writes credentials to `~/.flowstate/config.json` under a dedicated `cloud-pay` server profile. The local profile (if present) is left untouched. `cloud *` subcommands read the JWT by id (`cloud-pay`) regardless of which profile is "active", so the dual-session model just works.

```
~/.flowstate/config.json
├── activeServerId: "local"          ← stays local; cloud login does NOT flip this
└── servers
    ├── local            (service-token instance auth — see flowstate-cli-local-auth)
    └── cloud-pay
        ├── url:        https://api.epicflowstate.ai/payments
        ├── domainId:   cloud
        ├── oauthTokenUrl: https://id.epicflowstate.ai/api/oauth/token
        ├── oauthClientId: flowstate-cli
        └── auth
            ├── accessToken    (JWT, ~24h TTL — auto-refreshes via refresh_token)
            ├── refreshToken
            ├── expiresAt
            ├── userId         (e.g. eg6xE11kHUdmZDkpEbQ-)
            └── email          (or the wallet address when wallet-method)
```

---

## Two methods

### Method 1: OAuth (browser-based, default)

```bash
flowstate cloud login                       # default --method oauth
flowstate cloud login --method oauth
```

Opens the system browser to `https://id.epicflowstate.ai/auth/authorize`, runs PKCE, and returns the JWT to a localhost callback. Best for human operators on a workstation with a browser.

### Method 2: Wallet (SAGA ETH eth-login)

```bash
flowstate cloud login --method wallet --wallet 0xPRIVATE_KEY
```

Signs an EIP-191 challenge with the agent's SAGA wallet. Best for headless containers (openclaw sidecars) that have a provisioned wallet at `/agent/config/wallet/eth-private-key` but no browser. Full protocol details in `flowstate-cli-wallet-auth`.

---

## The dual-session contract

Two server profiles can coexist:

| Subcommand | Reads from | Profile id |
| ---------- | ---------- | ---------- |
| `flowstate <anything>` (no `cloud` prefix) | active server (`activeServerId`) | typically `local` |
| `flowstate cloud login` | (writes) | `cloud-pay` |
| `flowstate cloud instances` | `cloud-pay` (by id, via `getCloudAuthToken()`) | `cloud-pay` |
| `flowstate cloud status` | `cloud-pay` (by id) | `cloud-pay` |
| `flowstate cloud dojo *` | `cloud-pay` (via `setCloudDojoOverrides` preAction hook) | `cloud-pay` |
| `flowstate cloud marketplace *` | `cloud-pay` (by id) | `cloud-pay` |
| `flowstate cloud identity *` | `cloud-pay` (by id) | `cloud-pay` |
| `flowstate cloud directory *` | `cloud-pay` (by id) | `cloud-pay` |
| `flowstate cloud payment *` | `cloud-pay` (by id) | `cloud-pay` |
| `flowstate cloud dashboard *` | `cloud-pay` (by id) | `cloud-pay` |
| `flowstate cloud epicflowstate *` | `cloud-pay` (by id) | `cloud-pay` |

So a typical agent's session has:

- `activeServerId: "local"` — ensures `flowstate agent inbox` keeps working
- `servers.local.auth.serviceToken` — instance MCP auth
- `servers["cloud-pay"].auth.accessToken` — cloud APIs

Both work simultaneously without one breaking the other.

---

## When to use each profile

| Goal | Use |
| ---- | --- |
| Read inbox, post conversations, write to local D1 | Local profile (default — no `cloud` prefix) |
| Browse marketplace listings, install plugins by id | `flowstate cloud marketplace ...` (cloud-pay) |
| LMS courses/modules/items/teams CRUD | `flowstate cloud dojo ...` (cloud-pay) |
| Provision a new cloud tenant, check tenant status | `flowstate cloud signup` / `flowstate cloud status` (cloud-pay) |
| Publish a plugin to the marketplace (after enrollment) | `flowstate plugin publish` (cloud-pay JWT auto-resolved) |

---

## Quick reference

### Login (interactive operator)

```bash
flowstate cloud login                # opens browser
```

### Login (headless agent)

```bash
flowstate cloud login \
  --method wallet \
  --wallet "$(cat /agent/config/wallet/eth-private-key)" \
  --identity-url https://id.epicflowstate.ai
```

The call goes through Overwatch's MITM by design (egress audit + credential injection). The boot-time CA install means Node's undici trusts the cert without any per-call `NO_PROXY=…` / `HTTPS_PROXY=""` workaround. See `flowstate-cli-wallet-auth` for the wallet flow specifics and `flowstate-cloud-gateway-routing` for the trust-store contract.

### Inspect the cloud session

```bash
jq '.servers["cloud-pay"].auth | {userId, email, expiresAt}' ~/.flowstate/config.json
```

### Manually switch active server (rare)

`flowstate cloud login` does NOT flip `activeServerId` (since PR #335). If you genuinely want subsequent `flowstate <subcommand>` calls to hit cloud-pay instead of local, use the dedicated server profile command:

```bash
flowstate server use cloud-pay   # switch active to cloud-pay
flowstate server use local       # switch back
flowstate server list            # list profiles + show which is active
```

This is rarely correct — flipping to `cloud-pay` breaks `flowstate agent inbox` and other instance commands.

### Logout

```bash
flowstate cloud logout
```

Clears the `cloud-pay` profile. Local profile stays intact.

---

## Common errors

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `Missing Dojo API token. Set FLOWSTATE_DOJO_TOKEN, use --token <jwt>, or configure ~/.flowstate/config.json.` | No `cloud-pay` profile in config (cloud login never ran or was logged out) | Run `flowstate cloud login` first |
| `Error: HTTP 401 Unauthorized` from `flowstate cloud dojo profile` | Cloud-pay JWT is expired and refresh failed | Run `flowstate cloud login` again |
| `flowstate agent inbox` returns the cloud URL instead of kong | A pre-PR-335 cloud login flipped `activeServerId` | `flowstate server use local` |
| `Error: fetch failed` during cloud login | Overwatch MITM intercepts the identity service connection | See `flowstate-cli-wallet-auth` for the NO_PROXY bypass |
| `Unable to add cloud-pay server` | `~/.flowstate/config.json` is corrupt or has the wrong shape | Delete the file and re-run agent provisioning + cloud login |

---

## Cross-references

- `flowstate-cli-local-auth` — the parallel `local` profile, its service token, and instance routing
- `flowstate-cli-wallet-auth` — wallet method specifics (challenge/sign/verify, EIP-155 chain ids)
- `flowstate-cloud-gateway-routing` — what `cloud *` subcommands talk to and how the gateway dispatches to upstream services
- `flowstate-dojo-cli` / `flowstate-plugin-lifecycle` — concrete consumers of the cloud-pay JWT

---

_Created: 2026-05-04_
