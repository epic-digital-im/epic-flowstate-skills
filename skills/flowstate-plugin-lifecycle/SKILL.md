---
name: flowstate-plugin-lifecycle
description: Use when scaffolding, building, signing, publishing, or installing a FlowState plugin / extension via `flowstate plugin <verb>`, debugging "No developer signing key found" or 403 from `/marketplace/developer/...`, or producing a `.fsext` archive from agent code - documents the full create→build→enroll→publish→install lifecycle, ed25519 signing, and the marketplace developer-enrollment requirement
---

# Plugin Lifecycle

**Status:** Active
**Purpose:** End-to-end reference for creating a FlowState plugin from scaffold through signed publish and remote install
**Scope:** `flowstate plugin <verb>` — `create`, `build`, `enroll`, `publish`, `install`, `update`, `rollback`, `uninstall`
**Trigger:** Need to ship a plugin to the FlowState Marketplace, or install a `.fsext` archive locally

---

## Overview

A plugin is a self-contained `.fsext` ZIP archive holding:

- `flowstate.plugin.json` — manifest (id, name, version, kind, contributes, main entry)
- `dist/` — built JS bundle (vite + module-federation for `extension` kind)
- `package.json` — npm metadata
- Optional `marketplace/` — listing assets (icon, screenshots)

The lifecycle has 5 ordered phases: **create → build → enroll → publish → install**. Phases 1–2 are local; 3–4 require a cloud-pay JWT and a developer enrollment on the marketplace; 5 can target either a local archive or a marketplace listing id.

```
┌─────────┐   ┌──────┐   ┌────────┐   ┌─────────┐   ┌─────────┐
│ create  │──▶│ build│──▶│ enroll │──▶│ publish │──▶│ install │
│ scaffold│   │ .fsext│  │ ed25519│   │ marketp.│   │ local /  │
└─────────┘   └──────┘   └────────┘   └─────────┘   │ remote  │
                                                     └─────────┘
```

---

## Prerequisites

| Phase | Needs |
| ----- | ----- |
| create | nothing (writes to a fresh dir) |
| build  | `yarn install` succeeds in the scaffold (vite, @vitejs/plugin-react, @module-federation/vite) |
| enroll | cloud-pay JWT (`flowstate cloud login`) AND a developer account on the marketplace (separate enrollment outside this skill) |
| publish | enrolled signing key + cloud-pay JWT |
| install (local) | a `.fsext` file on disk |
| install (remote) | cloud-pay JWT AND the listing must be published |

---

## Step 1: Create

```bash
flowstate plugin create <name> --kind <app|extension|theme> [--no-install]
```

Options:

| Flag | Default | Notes |
| ---- | ------- | ----- |
| `-k, --kind <kind>` | `app` | `extension` for module-federation, `theme` for css-only, `app` for full pages |
| `-d, --path <path>` | `.` | Output dir; the actual scaffold dir is named `flowstate-<kind>-<name>` |
| `--no-install` | runs `yarn install` | Skip when network/CA access is blocked |

The scaffold creates ~12 files including `flowstate.plugin.json`, `package.json`, `vite.config.ts`, `src/plugin.tsx`, `__tests__/`, and `marketplace/`.

### Manifest shape (extension kind)

```json
{
  "$schema": "https://flowstate.dev/schemas/plugin-manifest.json",
  "id": "<name>",
  "name": "<name>",
  "displayName": "...",
  "version": "1.0.0",
  "kind": "extension",
  "description": "...",
  "main": "dist/index.js",
  "contributes": {}
}
```

**Scaffold gotcha (2026-05-04):** the extension scaffold's `vite.config.ts` does NOT define an `index.html` or explicit Rollup `input`, so `vite build` errors with `Could not resolve entry module "index.html"`. Workaround until the scaffold is fixed:

```bash
cat > index.html << 'HTML'
<!DOCTYPE html>
<html><head><title>$NAME</title></head>
<body><script type="module" src="/src/plugin.tsx"></script></body></html>
HTML
```

---

## Step 2: Build

```bash
flowstate plugin build [-d <path>]
```

Runs `vite build`, then packages the output as a `.fsext` ZIP. Produces:

| Artifact | Path |
| -------- | ---- |
| Built bundle | `dist/remoteEntry.js` (extension), `dist/index.html` (app) |
| Archive | `<name>-<version>.fsext` |
| Checksum | `<name>-<version>.fsext.sha256` |

If `--developer-id <id>` was provided AND a key exists for that id, the archive also gets an ed25519 detached signature. Otherwise: `Signing skipped (no --developer-id provided)`.

---

## Step 3: Enroll (one-time per developer)

```bash
flowstate plugin enroll --id <developerId> --marketplace-url https://api.epicflowstate.ai/marketplace
```

Generates an ed25519 keypair locally at `~/.flowstate/developer-keys/<developerId>.json` (mode 0600), then POSTs the public key to the marketplace at `/developer/{id}/signing-key`. The marketplace stores the key against the developer profile so future signed publishes verify.

Options:

| Flag | Notes |
| ---- | ----- |
| `--id <developerId>` | Local key filename (default `default`) |
| `--marketplace-url <url>` | Override base — default is `PRODUCTION_URLS.marketplace` (= `https://api.epicflowstate.ai/marketplace`) |
| `--force` | Overwrite an existing local key with the same id |
| `--dry-run` | Generate key locally; skip server registration |

**Common 403 (2026-05-04 e2e):**

```
Error: Signing key registration failed: 403 Forbidden — {"error":"Forbidden","status":403}
```

The wallet JWT was valid, but the caller's identity isn't enrolled as a marketplace developer yet. Marketplace developer enrollment is a separate workflow (likely SAGA / X402-paid or admin-grant) outside the CLI. If you hit this, the agent's wallet needs marketplace publisher status before any enroll/publish call works.

---

## Step 4: Publish

```bash
flowstate plugin publish [--developer-id <id>] [--skip-build] [--marketplace-url <url>] [--changelog <text>] [--price <amount>] [--dry-run]
```

Steps performed:

1. Build (unless `--skip-build`)
2. Sign the archive with the developer's ed25519 key (loads from `~/.flowstate/developer-keys/<id>.json`)
3. Request a presigned R2 upload URL from `/marketplace/developer/extensions/publish`
4. PUT the archive bytes to R2
5. POST finalize with the SHA-256 + signature; the marketplace verifies the signature against the enrolled public key and records the version

JWT comes from cloud-pay (auto-resolved through `cli-commands/marketplace/api-client.ts` which reads the active server's auth — see `flowstate-cli-cloud-auth`).

---

## Step 5: Install

### From local archive

```bash
flowstate plugin install ./<archive>.fsext [--skip-verify] [--accept-permissions]
```

Extracts to `~/.flowstate/marketplace/packages/<id>/<version>/`. The CLI also checks (unless `--skip-verify`):

- SHA-256 against the embedded `.sha256` checksum
- ed25519 signature against the publisher's public key (only when both signature + key present)

### From marketplace listing

```bash
flowstate plugin install <listing-id> [--marketplace-url <url>] [--token <jwt>]
```

Resolves `versions/latest`, downloads the bundle (signed R2 URL), verifies, and installs to the same local path.

---

## Quick reference

### Full lifecycle (from inside an agent container)

All commands assume the agent container has booted with the Overwatch CA already installed in its trust store (see `flowstate-agent-cli-bootstrap`). The plugin lifecycle goes through Overwatch's MITM by design — egress audit + credential injection. No per-call NO_PROXY override needed.

```bash
# 1. Create + build
cd /tmp
flowstate plugin create my-skill --kind extension --no-install
cd flowstate-extension-my-skill
yarn install
echo '<!DOCTYPE html><html><body><script type="module" src="/src/plugin.tsx"></script></body></html>' > index.html
flowstate plugin build

# 2. Enroll (ONE-TIME per agent)
flowstate plugin enroll --id my-default --marketplace-url https://api.epicflowstate.ai/marketplace

# 3. Publish (assumes enrolled — see Step 3 caveats)
flowstate plugin publish --developer-id my-default --changelog "v1.0.0 initial release"

# 4. Install (local — verifies sig if present)
flowstate plugin install ./my-skill-1.0.0.fsext --accept-permissions

# 5. Verify
ls ~/.flowstate/marketplace/packages/my-skill/1.0.0/
```

---

## Common errors

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `Could not resolve entry module "index.html"` during build | Extension scaffold doesn't include `index.html` | Add a stub (see Step 1 gotcha) |
| `npm error code SELF_SIGNED_CERT_IN_CHAIN` during yarn install | Overwatch MITM CA not in container trust store — boot-time install hard-failed silently | Check entrypoint logs for `[install-overwatch-ca]`; confirm `OVERWATCH_HOST` resolves and the admin port is reachable. The Phase 5 smoke (`scripts/smoke/overwatch-egress.ts`) catches this regression class in CI. |
| `Error: No developer signing key found. Run 'flowstate plugin enroll' to register one.` | Publish without a local key OR `--developer-id` mismatch | Run `flowstate plugin enroll --id <id>` first; verify `~/.flowstate/developer-keys/<id>.json` exists |
| `Signing key registration failed: 403 Forbidden` | Caller wallet not enrolled as marketplace publisher | Server-side: marketplace developer enrollment must complete (separate workflow) before any enroll call works |
| `Bundle download failed: 404` from install-by-id | Listing/version doesn't exist on marketplace | Verify `flowstate cloud marketplace url` and the listing id |
| `Bundle download failed: 503` mid-download | R2 presigned URL expired (~1h TTL) | Re-run install — CLI re-resolves the URL |

---

## Cross-references

- `flowstate-cli-cloud-auth` — cloud-pay JWT for enroll/publish/install-from-id
- `flowstate-cli-wallet-auth` — wallet method for headless agent containers
- `flowstate-cloud-gateway-routing` — `/marketplace/*` route specifics, `joinUrl()` dedupe behavior
- `flowstate-agent-cli-bootstrap` — NO_PROXY/CA setup so the install network calls work end-to-end
- Manifest schema: `https://flowstate.dev/schemas/plugin-manifest.json`

---

_Created: 2026-05-04_
