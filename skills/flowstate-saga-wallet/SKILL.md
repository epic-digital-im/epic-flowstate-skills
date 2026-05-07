---
name: flowstate-saga-wallet
description: Use when working with an agent's SAGA-provisioned ETH wallet beyond just login (exporting the SAGA identity document, verifying the wallet matches the on-chain SAGA record, signing arbitrary messages, rotating the keypair, debugging "wallet address mismatch" or "saga document not found" errors) - documents the wallet file layout, SAGA identity document, ed25519 vs ECDSA usage, and the standing rule against host-shell secret reads
---

# SAGA Wallet Usage (Beyond eth-login)

**Status:** Active
**Purpose:** Manage and operate the SAGA-provisioned ETH wallet that every FlowState agent owns — separate from the one-shot eth-login flow
**Scope:** Agents with a provisioned SAGA identity (anyone created via `flowstate agent provision`)
**Trigger:** Need to verify wallet ↔ SAGA identity consistency, export the SAGA document for sharing, sign a message off-CLI, rotate keys, or audit who owns which on-chain address

---

## Overview

A SAGA wallet has TWO public records and ONE secret:

| Artifact | Path (host) | Path (sidecar) | Purpose |
| -------- | ----------- | -------------- | ------- |
| Private key | `<volumes>/agents/<name>/config/wallet/eth-private-key` | `/agent/config/wallet/eth-private-key` | EIP-191 signing |
| SAGA identity doc | `<volumes>/agents/<name>/config/saga/identity.json` | `/agent/config/saga/identity.json` | Public address, chain, handle, parent saga |
| `teammembers` row | D1 — `metadata.walletAddress`, `metadata.sagaDocumentId` | (via MCP) | Database mirror; canonical for queries |

The private key is mode 0600 on the host. The SAGA identity doc is signed by the wallet (self-attestation) and includes:

```json
{
  "$schema": "https://saga-standard.dev/schema/v1",
  "documentId": "saga_XIiNQaMaCMLqJhXU",
  "exportType": "identity",
  "signature": {
    "walletAddress": "0x...",
    "chain": "eip155:8453",
    "message": "SAGA export <docId> at <iso>",
    "sig": "0x..."
  },
  "layers": {
    "identity": {
      "handle": "ceo",
      "walletAddress": "0x...",
      "chain": "eip155:8453",
      "createdAt": "...",
      "parentSagaId": null,
      "cloneDepth": 0,
      "additionalWallets": [
        { "address": "<solana-address>", "chain": "solana:mainnet" }
      ]
    }
  }
}
```

---

## Standing rule: NEVER read or print the private key from the host shell

This is a hard rule (see `MEMORY.md` `feedback_no_host_shell_secret_reads.md`).

| FORBIDDEN | OK |
| --------- | -- |
| `cat /agent/config/wallet/eth-private-key` (in scrollback) | `node packages/cli/dist/index.js deploy --chain <chain> --production` (uses the file but doesn't print) |
| `op read "op://vault/wallet/key"` then `echo $KEY` | Pass through env to a single subprocess that signs and exits |
| `awk 'NR==1 {print substr($0,1,8)"..."}' eth-private-key` | Use the address (public) for verification — `head -c 6 eth-private-key` is still leaking |
| `printenv FLOWSTATE_PRIVATE_KEY` | Existence/length checks only: `[ -s file ] && echo "present" \|\| echo "missing"` |

The CLI's `flowstate cloud login --method wallet --wallet $(cat ...)` IS allowed because the key never lands in scrollback or process state beyond the signer's own memory.

---

## Quick reference

### Verify wallet ↔ SAGA identity ↔ teammembers row consistency

```bash
# Inside the agent container:
SAGA_ADDR=$(jq -r .layers.identity.walletAddress /agent/config/saga/identity.json)
echo "SAGA identity says: $SAGA_ADDR"

# Check the teammember row (via MCP)
TOKEN=$(jq -r .servers.local.auth.accessToken /home/openclaw/.flowstate/config.json)
ORG_ID=$(jq -r .servers.local.auth.orgId /home/openclaw/.flowstate/config.json)
AGENT_ID=$(jq -r .metadata.teamMemberId /agent/config/agent.json)

curl -s -X POST http://kong:8000/mcp/tools/collection-get \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"collection\":\"teammembers\",\"id\":\"$AGENT_ID\",\"orgId\":\"$ORG_ID\"}" \
  | jq -r '.result.document.metadata | {walletAddress, sagaDocumentId}'
```

The two `walletAddress` values MUST match. If they don't, the SAGA doc was rotated but the teammember row is stale (or vice versa) — re-run `flowstate agent provision` or use `saga-update-task-summary` to reconcile.

### Export the SAGA identity document for sharing

```bash
flowstate agent saga-export --name <name> --output ./<name>-saga.json
```

This copies the existing `<volumes>/agents/<name>/config/saga/identity.json` to the chosen path. The exported doc is signed and self-verifying — recipients can validate the signature with the embedded `walletAddress` without trusting the issuer.

### Read the wallet's public address (no secrets)

```bash
# From the SAGA identity (preferred — no host-shell access to the key)
jq -r .layers.identity.walletAddress /agent/config/saga/identity.json

# If only the key file is available, derive via a trusted CLI subcommand
# (the SAGA cli has a verify command — never print the key, only the address)
```

### Provision a fresh agent (creates wallet + SAGA + service token together)

```bash
flowstate agent provision <name>
```

This is the canonical bootstrap. It runs:

1. SAGA `saga-provision-identity` — generates the ed25519 keypair + ETH wallet
2. Writes the private key to the volume at mode 0600
3. Writes the signed SAGA document
4. Issues a service token for local-instance auth
5. Inserts the teammembers row with `walletAddress` + `sagaDocumentId`

If any step fails partway, the agent ends up half-provisioned (e.g. wallet exists but no service token). The fix is `flowstate agent provision --force <name>` to redo from scratch.

---

## Two crypto modes — don't confuse them

| Algorithm | Used by | Location | Notes |
| --------- | ------- | -------- | ----- |
| **secp256k1 / EIP-191** | `flowstate cloud login --method wallet`, SAGA self-signature | `wallet/eth-private-key` | The chain wallet — proves control of an Ethereum address |
| **ed25519** | `flowstate plugin enroll` / `flowstate plugin publish` (developer signing key) | `~/.flowstate/developer-keys/<id>.json` | Marketplace publisher signing — independent of the chain wallet |

These are SEPARATE keys. Enrolling as a marketplace developer doesn't use your ETH wallet — it generates a fresh ed25519 keypair purely for plugin signature verification. The marketplace links the public ed25519 key to the developer profile (which IS associated with the wallet via the JWT subject), but the keys themselves don't share material.

---

## Multi-chain wallets

The SAGA identity supports `additionalWallets` for non-EVM chains:

```json
"additionalWallets": [
  { "address": "3zxHB3H8QDBHnf7rdpB7BtxCGkatHvfhMvfiHdwxC1ww", "chain": "solana:mainnet" }
]
```

These are public addresses only — the corresponding private keys (if any) live in separate per-chain keyfiles. CLI doesn't currently use them for auth; they're metadata for downstream services that want multi-chain identity.

---

## Common errors

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `No SAGA identity found at /agent/config/saga/identity.json` | Agent never went through SAGA provision | `flowstate agent provision <name>` |
| `walletAddress` mismatch between SAGA doc and teammembers row | Provision ran twice, half-completed, or the row was hand-edited | Re-run `flowstate agent provision --force <name>` |
| `sagaDocumentId` on teammember points at a doc not in the documents collection | The doc was deleted or never persisted; the SAGA file may still exist on the volume | Re-export with `flowstate agent saga-export` and re-attach |
| Wallet file empty or wrong format | Volume write failed during provision | `provision --force` |

---

## Cross-references

- `flowstate-cli-wallet-auth` — using the wallet for cloud eth-login (the most common operation)
- `flowstate-agent-onboarding` — broader provisioning workflow that creates the wallet
- `flowstate-saga-skill-record` — recording verified skills against the SAGA identity (different layer)
- `flowstate-agent-identity` — slug → teamMemberId resolution (which connects to walletAddress)

---

_Created: 2026-05-04_
