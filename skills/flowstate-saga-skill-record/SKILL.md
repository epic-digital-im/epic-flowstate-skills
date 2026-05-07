---
name: flowstate-saga-skill-record
description: Use when an agent needs to record a verified skill against its SAGA identity (`saga_skills` upsert via the `saga-record-skill` MCP tool), running the local-stack equivalent of "publish a skill to dojo" when the production dojo backend isn't reachable, or building a skill-tracking workflow on top of the local instance - documents the MCP tool args, scoping rules, and how to verify the record landed
---

# SAGA Skill Recording

**Status:** Active
**Purpose:** Record an agent's verified skill in the local FlowState instance via the `saga-record-skill` MCP tool — the local-stack equivalent of a marketplace skill publish
**Scope:** Any agent with a service-token session against the local instance (no cloud-pay required)
**Trigger:** Agent completes a task and wants to mark the skill as verified, smoke-testing the SAGA stack, building a skill-tracking workflow that runs offline / pre-cloud

---

## Overview

Each agent in the local instance has a `saga_agent_state` record (auto-created during provision via `saga-provision-identity`) and an upsert table `saga_skills` keyed by `(agentId, skillName)`. The `saga-record-skill` MCP tool is the canonical way to populate `saga_skills`.

This is NOT the same as publishing a plugin to the marketplace (`flowstate plugin publish`). It's a local skill-registry write that:

- Lives entirely on the local instance (kong → mcp-http → d1-worker)
- Doesn't require a cloud-pay JWT
- Doesn't produce a downloadable artifact
- IS reachable from any openclaw sidecar with its service token

When the production dojo backend isn't deployed (the case as of 2026-05-04), this is the working path for "agent records a skill it can demonstrate".

---

## MCP tool: `saga-record-skill`

| Argument | Type | Required | Notes |
| -------- | ---- | -------- | ----- |
| `agentId` | string | yes | The teammember row id (e.g. `team_xEHnGgbV-I`) |
| `orgId` | string | yes | From `.flowstate/config.json` or `servers.local.auth.orgId` |
| `skillName` | string | yes | Stable slug, used as part of the upsert key |
| `category` | string | yes | Free-form taxonomy tag (e.g. `qa`, `engineering`, `analysis`) |
| `description` | string | no | Human-readable detail |
| `verificationMethod` | enum | no | Default `verified`. One of `verified`, `self-reported`, `peer-reviewed` |
| `taskCompleted` | boolean | no | Whether the triggering task succeeded |

The tool returns:

```json
{
  "created": true,
  "skillId": "saga_skill_<agentId>_<skillName>",
  "skillName": "<skillName>",
  "category": "<category>"
}
```

`created: false` indicates an upsert — the record existed and was updated in place.

---

## Quick reference

### Record a skill from inside an agent container

```bash
TOKEN=$(jq -r .servers.local.auth.accessToken /home/openclaw/.flowstate/config.json)
ORG_ID=$(jq -r .servers.local.auth.orgId /home/openclaw/.flowstate/config.json)
AGENT_ID=$(jq -r .metadata.teamMemberId /agent/config/agent.json)

curl -s -X POST http://kong:8000/mcp/tools/saga-record-skill \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"agentId\":\"$AGENT_ID\",
    \"orgId\":\"$ORG_ID\",
    \"skillName\":\"git-flow\",
    \"category\":\"engineering\",
    \"description\":\"Resolved 3 merge conflicts and shipped PR #335\",
    \"verificationMethod\":\"verified\",
    \"taskCompleted\":true
  }"
```

Expected response:

```json
{"success":true,"toolName":"saga-record-skill","result":{"content":"{\"created\":true,\"skillId\":\"saga_skill_team_xEHnGgbV-I_git-flow\",\"skillName\":\"git-flow\",\"category\":\"engineering\"}","isError":false}}
```

### Verify the record exists

`saga_skills` is NOT in the public collection registry, so `collection-query` returns `Unknown collection`. Use `saga-consistency-check` for a per-agent summary:

```bash
curl -s -X POST http://kong:8000/mcp/tools/saga-consistency-check \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"agentId\":\"$AGENT_ID\",\"orgId\":\"$ORG_ID\"}"
```

The response includes per-agent skill totals. A non-zero `withSkills` count for the agent confirms the upsert.

---

## Scoping rules

| Field | Source |
| ----- | ------ |
| `agentId` | teammembers row id (NOT the human-readable slug) — `team_xEHnGgbV-I`, NOT `ceo` |
| `orgId` | from config — `org_9f3omFEY2H` for the default local instance |
| `sagaId` | `saga_agent_state.id` (defaults to teamMemberId) — auto-resolved by the tool |
| `sessionId` | `<teamMemberId>_<orgId>` — auto-resolved |

The tool throws if `saga_agent_state` doesn't exist for the agent. If you see "Missing saga_agent_state record":

1. Run `flowstate agent provision <name>` if not already done
2. Or call `saga-provision-identity` for a one-shot provisioning of just the SAGA layer

---

## When to use this vs `flowstate plugin publish`

| Need | Tool |
| ---- | ---- |
| Track that an agent demonstrated capability X for org Y | `saga-record-skill` (this skill) |
| Distribute reusable code as an installable .fsext archive | `flowstate plugin publish` (`flowstate-plugin-lifecycle`) |
| Both — record completion AND publish a downloadable artifact | Both, in sequence |

`saga_skills` records DON'T flow to the marketplace. The marketplace's plugin metadata is stored separately in the marketplace's D1 (`templates`, `app_versions`, `publishers` per `flowstate-platform/packages/worker-marketplace-api`).

---

## Common errors

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `Missing saga_agent_state record` | Agent never went through SAGA provision | Run `flowstate agent provision <name>` once, OR call `saga-provision-identity` |
| `Unknown collection: saga_skills` from collection-query | The `saga_skills` table isn't in the public collection registry | Use `saga-consistency-check` instead |
| `success: false` from MCP envelope | Service token expired or wrong agentId | Refresh token via any `flowstate ...` call; verify `agentId` is the teammembers row id |
| `agentId mismatch` between agent.json and the tool args | The teammember row was rotated but the agent definition is stale | Re-run `flowstate agent sync` |

---

## Cross-references

- `flowstate-cli-local-auth` — service-token session needed to call the MCP tool
- `flowstate-agent-cli-bootstrap` — container bootstrap that gives the agent its service token
- `flowstate-agent-onboarding` — the broader onboarding flow that creates `saga_agent_state` in the first place
- `flowstate-plugin-lifecycle` — the marketplace publish flow (different concept, sometimes used together)

---

_Created: 2026-05-04_
