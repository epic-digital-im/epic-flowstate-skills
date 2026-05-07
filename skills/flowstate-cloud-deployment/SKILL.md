---
name: flowstate-cloud-deployment
description: Use when deploying FlowState platform services to Cloudflare, running fscloud deploy, troubleshooting deployment failures, configuring deploy.config.yaml, or managing 1Password secrets for deployment - provides the fscloud CLI workflow, warm container pipeline, service tiers, and deployment troubleshooting
---

# FlowState Cloud Deployment

**Status:** Active
**Purpose:** Standard operating procedure for deploying FlowState services to Cloudflare
**Scope:** All services in `deploy.config.yaml` (workers and Next.js apps)
**Trigger:** Need to deploy one or more services to production

---

## Overview

The `fscloud` CLI deploys services to Cloudflare Workers and Pages. A Docker container handles the build, secret injection, D1 migrations, and wrangler deploy. The host pre-resolves all 1Password secrets before starting Docker.

```
Single service:  fscloud deploy <name> --production
                 docker run --rm -> entrypoint.sh -> deploy

All services:    fscloud deploy --production
                 docker run -d (warm) -> exec setup -> exec deploy per service -> rm
```

**Announce at start:** "I'm using the flowstate-cloud-deployment skill to deploy services."

---

## Prerequisites

- Docker running on the host
- 1Password CLI authenticated (`op signin` or `OP_SERVICE_ACCOUNT_TOKEN`)
- `deploy.config.yaml` at repo root with service definitions
- 1Password items configured for each service (see Secret Setup section)

---

## Step 1: Verify Pre-Flight

**Who:** Deploying agent or operator
**Pause:** No

### Actions

1. Verify Docker is running:
   ```bash
   docker version
   ```

2. Verify 1Password auth:
   ```bash
   op whoami
   ```
   Or confirm `OP_SERVICE_ACCOUNT_TOKEN` is set.

3. Verify deploy config exists and parses:
   ```bash
   fscloud deploy --dry-run
   ```
   This prints deployment tiers without starting Docker.

### Done when

- Docker available, 1Password authenticated, dry-run prints tier list

---

## Step 2: Deploy Single Service

**Who:** Deploying agent or operator
**Pause:** Yes (production requires `--production` flag as intentional gate)

### Actions

Use this path when deploying a specific service (hotfix, single-service update):

```bash
# Dry-run first
fscloud deploy flowstate-identity --dry-run

# Deploy to production
fscloud deploy flowstate-identity --production
```

The CLI:
1. Loads `deploy.config.yaml` and resolves service config
2. Pre-resolves 1Password secrets on the host
3. Builds Docker image (if not pre-built)
4. Runs `docker run --rm` with the entrypoint
5. Parses JSON result from container stdout

### Service Types

| Type | What Happens |
|------|-------------|
| `worker` | wrangler bundles TypeScript and deploys directly |
| `nextjs` | rsync workspace, yarn install, OpenNext build, OpenNext deploy |

### Done when

- Container exits 0 with `{"status":"deployed"}` JSON
- Service URL printed (workers.dev or pages.dev)

---

## Step 3: Deploy All Services

**Who:** Deploying agent or operator
**Pause:** Yes (production gate)

### Actions

Use this path for full platform deployment:

```bash
# Dry-run to see tiers
fscloud deploy --dry-run

# Full production deploy
fscloud deploy --production

# With reduced concurrency (default: 3)
fscloud deploy --production --concurrency 2
```

The warm container pipeline:
1. Cleans up any stale `flowstate-deploy-warm` container
2. Builds Docker image once
3. Starts warm container (`docker run -d`)
4. Runs setup phase (`docker exec setup`): rsync + yarn install
5. For each tier: `docker exec deploy` per service (concurrent within tier)
6. Stops and removes container (`docker rm -f`, runs in `finally` block)

### Deployment Tiers

Services deploy in dependency order. If any service in a tier fails, remaining tiers are skipped.

```
Tier 0: identity, obs, sync, payment, provisioning, mcp,
        agent-memory, dojo-api, dashboard-api, directory-api,
        compliance, docs                              (no deps)
Tier 1: id-api, marketplace-api, epicflowstate-api,
        epic-lms, dojo, directory, admin, dojo-jobs   (depend on tier 0)
Tier 2: marketplace, dashboard                        (depend on tier 1)
Tier 3: gateway                                       (depends on all API workers)
```

### Done when

- Summary table printed with status per service
- No `[fail]` entries in summary

---

## Step 4: Verify Deployment

**Who:** Deploying agent or operator
**Pause:** No

### Actions

After deployment completes:

1. Check service health via gateway:
   ```bash
   curl -s https://api.epicflowstate.ai/health
   ```

2. For Next.js apps, verify the pages.dev URL loads:
   ```bash
   curl -sI https://flowstate-identity.pages.dev
   ```

3. Check D1 migration count in deploy output (if applicable)

4. For identity service, verify OAuth flow works

### Done when

- Health checks pass
- No 404 errors on static assets
- OAuth flow functional (if identity was deployed)

---

## Secret Setup (1Password)

Each service needs a 1Password item in the configured vault. The item name must match the `op.item` value in `deploy.config.yaml`.

### Required Fields per Service

| Field | Format | Example |
|-------|--------|---------|
| `d1_bindings` | JSON object `{BINDING: "database-id"}` | `{"DB": "abc123-def456"}` |
| `kv_bindings` | JSON object `{BINDING: "namespace-id"}` | `{"SESSIONS": "xyz789"}` |
| `r2_bindings` | JSON object `{BINDING: "bucket-name"}` | `{"ASSETS": "my-bucket"}` |
| `wrangler_secrets` | Comma-separated secret names | `SESSION_SECRET,GITHUB_CLIENT_SECRET` |
| `<secret_name>` | Secret value | (concealed field) |

### Account Item

The `cloudflare-account` item provides:

| Field | Value |
|-------|-------|
| `account_id` | Cloudflare account ID |
| `api_token` | Cloudflare API token |

If `api_token` is not in 1Password, the CLI falls back to `CLOUDFLARE_API_TOKEN` env var.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `No 1Password authentication available` | Neither service token nor user session active | Run `op signin` or set `OP_SERVICE_ACCOUNT_TOKEN` |
| `Docker is not available` | Docker daemon not running | Start Docker Desktop or `systemctl start docker` |
| `yarn install failed` | Dependency resolution error in container | Check stderr for specific package failures; verify yarn cache volume |
| Static assets 404 after Next.js deploy | Stale build artifacts | The warm container cleans `.open-next/` and `.next/` between builds automatically. For single deploys, delete manually and retry |
| `container name already in use` | Stale warm container from crashed run | `docker rm -f flowstate-deploy-warm` |
| `D1 migration failed` | Schema conflict or network error | Backup exists at `.deploy-backups/`. Review migration files, fix, retry |
| `wrangler deploy failed` | API token expired or permissions | Refresh token in 1Password |
| `Environment requires --production flag` | Safety gate for production | Add `--production` to the command |

---

## Configuration Reference

### deploy.config.yaml

```yaml
version: 1
account: flowstate

op:
  vault: fs-cloud-prod          # 1Password vault
  accountItem: cloudflare-account  # Account-level credentials

environments:
  production:
    domain: epicflowstate.ai
    requireFlag: true           # --production flag required

services:
  <service-name>:               # Must match wrangler name
    type: worker | nextjs
    package: packages/<dir>     # Relative to repo root
    op:
      item: <1password-item>    # Service-specific secrets
    dependsOn: [<service>, ...]  # Deploy order dependencies
```

### Container Environment Variables

| Variable | Set By | Purpose |
|----------|--------|---------|
| `DEPLOY_CONFIG` | CLI (base64) | Resolved service config (no secrets) |
| `DEPLOY_MODE` | CLI | `dry-run`, `deploy`, or `setup` |
| `OP_PRERESOLVED` | CLI (base64) | Pre-resolved 1Password field maps |
| `CLOUDFLARE_API_TOKEN` | Host env (passthrough) | Fallback API token |
| `YARN_GLOBAL_FOLDER` | CLI | Points to persistent yarn cache volume |

---

## Conventions

| Item | Convention |
|------|------------|
| CLI binary | `fscloud` |
| Deploy config | `deploy.config.yaml` at repo root |
| Service names | Must match Cloudflare Worker name in wrangler config |
| 1Password vault | One vault per environment |
| 1Password items | One item per service + one account item |
| Backup directory | `.deploy-backups/` at repo root (gitignored) |
| Docker image | `flowstate-deploy` (rebuilt each deploy) |
| Warm container | `flowstate-deploy-warm` (deploy-all only) |
| Yarn cache | `flowstate-deploy-yarn-cache` Docker named volume |
| Wrangler configs | `/tmp/wrangler-${SERVICE}.json` in container |

---

## Red Flags

- Deploying without `--dry-run` first on a new config change
- Skipping 1Password setup for a new service (deploy will fail at secret resolution)
- Running `docker rm -f` on the warm container while a deploy-all is in progress
- Editing `deploy.config.yaml` service keys without updating the matching wrangler name
- Deploying the gateway before its upstream workers (the tier system prevents this, but manual deploys can bypass it)

---

_Created: 2026-04-17_
