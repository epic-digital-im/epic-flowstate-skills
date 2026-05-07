---
name: flowstate-dojo-cli
description: Use when running CRUD against the FlowState Dojo LMS from the CLI (`flowstate dojo *` or `flowstate cloud dojo *`), debugging "Missing Dojo API token" or 404 from `/dojo/*`, or building a new dojo subcommand against the canonical OpenAPI types - documents the dojo command tree, token resolution (env / config / cloud-pay JWT), and the gateway path-prefix routing for every dojo endpoint
---

# Dojo LMS CLI (Courses, Modules, Items, Enrollments, Teams)

**Status:** Active
**Purpose:** Reference for the `flowstate dojo` and `flowstate cloud dojo` command trees: how they authenticate, where they call, and which CRUD endpoints they expose
**Scope:** Every dojo subcommand in `packages/flowstate-cli/src/cli-commands/dojo/`
**Trigger:** Need to create/list/update/delete dojo entities, build a new dojo subcommand, debug an auth or routing failure

---

## Overview

There are **two** dojo command trees with the same subcommand surface:

| Tree | Token source | API URL |
| ---- | ------------ | ------- |
| `flowstate dojo *` | env `FLOWSTATE_DOJO_TOKEN` → file `~/.flowstate/config.json` `.dojo.token` | env `FLOWSTATE_DOJO_URL` → file `.dojo.apiUrl` → `PRODUCTION_URLS.dojo` |
| `flowstate cloud dojo *` | cloud-pay JWT (`getCloudAuthToken()` in `cli-commands/cloud/cloud-auth.ts`) | `PRODUCTION_URLS.dojo` (= `https://api.epicflowstate.ai/dojo`) |

Use **`flowstate cloud dojo`** when an agent or human has run `flowstate cloud login` (wallet or OAuth). It's the recommended path — no separate token to manage. The bare `flowstate dojo` exists for legacy / explicit-token callers.

```
flowstate cloud dojo <verb>
   │  preAction: setCloudDojoOverrides({ apiUrl: PRODUCTION_URLS.dojo, getToken: getCloudAuthToken })
   ▼
flowstate dojo <verb>
   │  loadDojoConfig() → resolves apiUrl + token via overrides → env → file
   ▼
createDojoClient({ apiUrl, token })   (openapi-fetch with packages/flowstate-cli/src/generated/dojo/types.ts)
   │  GET/POST/PATCH/DELETE
   ▼
api.epicflowstate.ai/dojo/...   (gateway strips /dojo, forwards to DOJO_API_SERVICE)
```

---

## Command tree

Both trees expose the shared core surface below. `flowstate dojo` (env-overridable) ALSO exposes a few extras not yet on `flowstate cloud dojo`: `skill`, `publisher`, `course`, and `seed-epic-digital`.

Shared between `flowstate dojo` and `flowstate cloud dojo`:

| Subcommand | Purpose | OpenAPI path(s) |
| ---------- | ------- | --------------- |
| `courses list` | List courses | `GET /courses` |
| `courses get <id>` | Course detail | `GET /courses/{id}` |
| `courses create` | Create course | `POST /courses` |
| `courses update <id>` | Patch course | `PATCH /courses/{id}` |
| `courses delete <id>` | Delete course | `DELETE /courses/{id}` |
| `courses publish <id>` | Publish course | `POST /courses/{id}/publish` |
| `courses enroll <id>` | Enroll caller in course | `POST /courses/{id}/enroll` |
| `modules list <courseId>` | List modules under a course | `GET /courses/{courseId}/modules` |
| `modules get <id>` | Module detail | `GET /modules/{id}` |
| `modules create <courseId>` | Create module | `POST /courses/{courseId}/modules` |
| `modules update <id>` | Patch module | `PATCH /modules/{id}` |
| `modules delete <id>` | Delete module | `DELETE /modules/{id}` |
| `items list <moduleId>` | List items (lessons) | `GET /modules/{moduleId}/items` |
| `items get <id>` | Item detail | `GET /module-items/{id}` |
| `items create <moduleId>` | Create item | `POST /modules/{moduleId}/items` |
| `items update <id>` | Patch item | `PATCH /module-items/{id}` |
| `items delete <id>` | Delete item | `DELETE /module-items/{id}` |
| `items complete <id>` | Mark completion | `POST /module-items/{id}/complete` |
| `enrollments list` | List my enrollments | `GET /enrollments` |
| `teams members <teamId>` | List team members | `GET /teams/{teamId}/members` |
| `teams content <teamId>` | List team content | `GET /teams/{teamId}/content` |
| `teams events <teamId> --event-id <id>` | List linked content for a team event | `GET /teams/{teamId}/events/{eventId}/linked-content` |
| `profile` | Authenticated user profile | `GET /profile` |
| `tokens` | Token balance | `GET /tokens/balance` |
| `lead-subscribe` | Subscribe email to newsletter (public) | `POST /leads/subscribe` |
| `url-metadata <url>` | Open Graph metadata (public) | `GET /url-metadata` |

`flowstate dojo`-only extras:

| Subcommand | Purpose |
| ---------- | ------- |
| `skill` | Skill catalog commands |
| `publisher` | Publisher management |
| `course` | Course catalog commands (read-only listing-style) |
| `seed-epic-digital` | Sign in as the named agent and create the epic-digital team (idempotent) |

Canonical types: `packages/flowstate-cli/src/generated/dojo/types.ts` (auto-generated from the dojo OpenAPI spec — never hand-edit).

---

## Quick reference

### Headless agent CRUD (cloud-pay JWT)

```bash
# Prerequisite: cloud login (see flowstate-cli-cloud-auth / flowstate-cli-wallet-auth)
flowstate cloud login --method wallet --wallet "$(cat /agent/config/wallet/eth-private-key)" --identity-url https://id.epicflowstate.ai

# CRUD
flowstate cloud dojo profile
flowstate cloud dojo courses list --json
flowstate cloud dojo courses create --title "Q4 Strategy" --description "Test course"
COURSE_ID=$(flowstate cloud dojo courses list --json | jq -r '.[0].id')
flowstate cloud dojo modules create $COURSE_ID --title "Module 1"
MOD_ID=$(flowstate cloud dojo modules list $COURSE_ID --json | jq -r '.[0].id')
flowstate cloud dojo items create $MOD_ID --title "Lesson 1" --content-type lesson
flowstate cloud dojo courses publish $COURSE_ID
flowstate cloud dojo enrollments list
```

### Operator with explicit token

```bash
export FLOWSTATE_DOJO_TOKEN='eyJ...'
export FLOWSTATE_DOJO_URL='https://api.epicflowstate.ai/dojo'
flowstate dojo profile
flowstate dojo courses list
```

### JSON output (for piping)

Every CRUD subcommand accepts `--json` for machine-readable output. Without `--json`, output is human-readable tables/text.

---

## Token resolution order (`loadDojoConfig`)

`packages/flowstate-cli/src/cli-commands/dojo/config.ts`:

1. Explicit `--token <jwt>` flag
2. `cloudOverride.getToken()` (set by `flowstate cloud dojo` preAction → `getCloudAuthToken()`)
3. `process.env.FLOWSTATE_DOJO_TOKEN`
4. File config: `~/.flowstate/config.json` `.dojo.token`

If all four are empty:

```
Missing Dojo API token. Set FLOWSTATE_DOJO_TOKEN, use --token <jwt>, or configure ~/.flowstate/config.json.
```

The fix is almost always `flowstate cloud login`, then re-run via `flowstate cloud dojo *` (which auto-resolves the cloud-pay JWT through the override).

---

## Gateway routing

All dojo endpoints are JWT-gated at the gateway. Path mapping:

```
CLI request:    https://api.epicflowstate.ai/dojo/courses
Gateway:        matches /dojo/* → DOJO_API_SERVICE, stripPath: true
Upstream sees:  /courses
```

See `flowstate-cloud-gateway-routing` for the full route table and proxy/NO_PROXY notes.

---

## Common errors

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `Missing Dojo API token` | No cloud-pay session AND no env/file token | Run `flowstate cloud login` |
| `Error (404): Dojo API request failed (404)` from `cloud dojo profile` | Production dojo backend not yet deployed (OpenAPI returns empty paths) | Server-side issue; tracked at the gateway-routes level. Verify with `curl https://api.epicflowstate.ai/dojo/openapi.json` — if `paths: {}`, backend stub. |
| `Error: fetch failed` | Overwatch MITM blocks `api.epicflowstate.ai` | Add the host to NO_PROXY (see `flowstate-agent-cli-bootstrap`) |
| `403 Forbidden` on a write CRUD | Token valid but caller lacks permission | Caller's user/org doesn't own the resource — check ownership and re-auth as the right wallet |
| `Unexpected non-JSON response from MCP server: ...` | Wrong endpoint (calling MCP instead of dojo gateway) | Use `flowstate cloud dojo` (not bare `flowstate dojo` if you intend production) |

---

## Cross-references

- `flowstate-cli-cloud-auth` — how `cloud-pay` JWT gets minted (the preferred token source)
- `flowstate-cli-wallet-auth` — agent containers using SAGA wallet to log in
- `flowstate-cloud-gateway-routing` — `/dojo/*` route specifics
- Generated OpenAPI types: `packages/flowstate-cli/src/generated/dojo/types.ts` (regenerate via the `yarn generate:types` script when the spec changes)

---

_Created: 2026-05-04_
