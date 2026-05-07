---
name: flowstate-cli-wallet-auth
description: Use when an agent needs to authenticate to FlowState Cloud using its SAGA ETH wallet (eth-login challenge/sign/verify against the identity service), debugging "Error: fetch failed" on `flowstate cloud login --method wallet`, or routing the wallet keyfile from `<agent>/config/wallet/eth-private-key` into the CLI's wallet flow - documents the wallet location, eth-login protocol, and DNS/proxy gotchas
---

# CLI Wallet Authentication (SAGA ETH eth-login)

**Status:** Active
**Purpose:** Authenticate the flowstate CLI against the FlowState Cloud identity service using a SAGA-provisioned ETH wallet via the EIP-191 challenge/sign/verify flow
**Scope:** `flowstate cloud login --method wallet ...` from any agent with a provisioned SAGA wallet
**Trigger:** Agent needs a cloud-pay JWT (for marketplace, dojo, directory CRUD), CLI must prove control of the wallet address

---

## Overview

The wallet flow proves the caller controls the private key for a chain address. It does NOT depend on a username/password or a long-lived service token.

```
1. CLI reads private key  →  2. POST /api/auth/wallet/challenge { walletAddress, chain }
                             ←     { challenge, nonce, expiresAt }
                              3. Sign challenge with private key (EIP-191 personal_sign)
                              4. POST /api/auth/wallet/verify { walletAddress, chain, signature, nonce }
                             ←     { access_token, refresh_token, user_id, is_new_account, email }
                              5. Store JWT in ~/.flowstate/config.json under cloud-pay profile
```

The identity service returns a JWT signed by the production JWKS at `/.well-known/jwks.json` (gateway: `https://api.epicflowstate.ai/.well-known/jwks.json`).

---

## Where the wallet lives

For agents provisioned via `flowstate agent provision <name>`, the SAGA identity step writes:

| Path (host) | Path (in openclaw sidecar) | Contents |
| ----------- | -------------------------- | -------- |
| `<volumes>/agents/<name>/config/wallet/eth-private-key` | `/agent/config/wallet/eth-private-key` | 0x-prefixed hex private key (66 chars), mode 0600 |
| `<volumes>/agents/<name>/config/saga/identity.json` | `/agent/config/saga/identity.json` | SAGA identity document (public address, chain, handle) |

**Never read or print the private key.** The CLI reads it via `cat` only as input to `--wallet`. Operators MUST NOT `op read` it, pipe it through other tools, or echo it to stdout — see the standing rule in MEMORY.md (`feedback_no_host_shell_secret_reads.md`).

---

## Quick reference

### From inside an openclaw sidecar

```bash
PRIVATE_KEY=$(cat /agent/config/wallet/eth-private-key)
flowstate cloud login \
  --method wallet \
  --wallet "$PRIVATE_KEY" \
  --identity-url https://id.epicflowstate.ai
```

The `--identity-url` flag is currently REQUIRED to point at the standalone identity host because the production gateway's `/auth/api/auth/wallet/*` routes are not yet exposed (tracked in the gateway route table at `flowstate-platform/packages/gateway-routes`). Once they land, the default `--identity-url` collapses to the gateway base.

### Verify the session was stored

```bash
jq '.servers["cloud-pay"].auth | {userId, email, expiresAt}' ~/.flowstate/config.json
```

The `email` field stores the wallet address (lowercase 0x-prefixed) when the user has no email on file. `is_new_account: true` on first login means the identity service auto-created the account from the verified signature.

---

## DNS / proxy

The wallet flow makes outbound calls to `id.epicflowstate.ai` (challenge + verify endpoints). From inside an openclaw sidecar these calls go through Overwatch's MITM proxy by design — egress audit + credential injection happen there. Since the Overwatch CA cleanup (PRs #356 / #357 / #358 / #360) the openclaw entrypoint fetches Overwatch's CA at boot from `http://${OVERWATCH_HOST}:${OVERWATCH_ADMIN_PORT}/ca.crt`, fingerprint-verifies it against `/ca.json`, and installs it into the system trust store before the entrypoint exits. Node's undici/fetch trusts it. There is no per-call override:

```bash
flowstate cloud login \
  --method wallet \
  --wallet "$(cat /agent/config/wallet/eth-private-key)" \
  --identity-url https://id.epicflowstate.ai
```

Going forward (gateway has wallet routes), `id.epicflowstate.ai` will be replaced by `api.epicflowstate.ai`.

If you hit `Error: fetch failed`, the boot-time CA install hard-failed silently — check the entrypoint logs for `[install-overwatch-ca]` lines and confirm `OVERWATCH_HOST` resolves from inside the container. The Phase 5 smoke (`scripts/smoke/overwatch-egress.ts`) catches the same regression class in CI.

---

## Active server is NOT changed

Since 2026-05-04 (PR #335), `flowstate cloud login` does NOT flip `activeServerId` to `cloud-pay`. The new `cloud-pay` profile is added alongside the existing `local` profile. This is intentional:

- `flowstate <subcommand>` (no `cloud` prefix) keeps using the `local` profile for instance-scoped MCP calls
- `flowstate cloud <subcommand>` always uses `cloud-pay` by id (via `getCloudAuthToken()` in `cli-commands/cloud/cloud-auth.ts`)

If a previous wallet login (pre-PR-335) flipped your active server, see `flowstate-cli-local-auth` for how to reset it to `local`.

---

## Verifying the wallet address client-side

Before calling the API, the CLI derives the address from the private key using ethers.js:

```ts
import { Wallet } from 'ethers'
const signer = new Wallet(privateKeyHex)
console.log(signer.address)  // e.g. 0x0A618faD60a228F1bf67765Fc962346F7b9a72C4
```

Cross-check it against `/agent/config/saga/identity.json` `layers.identity.walletAddress` — if they don't match, the wallet file was overwritten or rotated and the SAGA identity is stale (re-provision the agent).

---

## Default chain

The CLI uses `eip155:8453` (Base mainnet) by default. Override with `--chain <caip2>`:

```bash
flowstate cloud login --method wallet --wallet "$PK" --chain eip155:1   # Ethereum mainnet
flowstate cloud login --method wallet --wallet "$PK" --chain eip155:8453  # Base (default)
```

The challenge string format includes `Chain: Base (EIP-155: 8453)` so signers know what they're authorizing.

---

## Common errors

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `Error: fetch failed` on Requesting challenge step | Overwatch MITM cert not trusted by Node undici | Bypass the proxy for `id.epicflowstate.ai` (see DNS / proxy gotchas above) |
| `Verification failed: 400` from `/api/auth/wallet/verify` | Signature didn't match the challenge — usually a chain mismatch | Confirm `--chain` matches the chain used for the challenge |
| `Could not resolve host: id.epicflowstate.ai` | Overwatch DNS firewall doesn't allow this hostname | Add `id.epicflowstate.ai` to NO_PROXY (forces direct DNS) |
| `Invalid wallet input. Provide a hex private key or BIP-39 seed phrase.` | The keyfile was empty or corrupted | Re-provision the agent's SAGA identity |

---

## Cross-references

- `flowstate-cli-cloud-auth` — broader cloud auth flow including OAuth (browser) alternative
- `flowstate-agent-cli-bootstrap` — how to invoke wallet auth from inside an openclaw sidecar with the right env
- `flowstate-cloud-gateway-routing` — where wallet endpoints live in the gateway route table

---

_Created: 2026-05-04_
