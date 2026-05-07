---
name: flowstate-project-facts
description: Use during planning and brainstorming to load project-specific facts (deployment posture, migration policy, auth model, routing topology, business model) from .flowstate/project-facts.json into the agent context
---

# Project Facts

**Status:** Active
**Purpose:** Load project-specific architectural and operational facts into planning context
**Scope:** Called by `flowstate-brainstorming` and `flowstate-multi-phase-planning` during context loading
**Trigger:** Before design or planning decisions are made

---

## Overview

Every project has architectural invariants that must be respected during planning: deployment posture (greenfield vs brownfield), migration policy (destructive vs non-destructive), auth model, routing topology, and business model. This skill reads these from a curated JSON file and injects them into the agent's planning context.

This is a stub for the future `project-facts-get/set` MCP tools. Until those ship, the facts are stored locally.

```
Read Facts File -> Validate -> Inject into Context
      (1)             (2)            (3)
```

---

## Step 1: Read Facts File

**Who:** Assigned agent
**Pause:** No

### Actions

1. Read `.flowstate/project-facts.json` from the repository root
2. If the file does not exist:
   - Log: "No project-facts.json found. Using defaults."
   - Use empty/default values
3. Expected schema:
   ```json
   {
     "deploymentPosture": "greenfield-against-production",
     "migrationPolicy": "non-destructive-only",
     "authModel": "jwt-via-gateway",
     "routingTopology": "kong-gateway-to-workers",
     "businessModel": "saas-tiered",
     "customFacts": {}
   }
   ```

### Done when

- Facts file read or defaults applied

---

## Step 2: Validate

**Who:** Assigned agent
**Pause:** No

### Actions

1. Validate required fields are present:
   - `deploymentPosture` — one of: `greenfield-against-production`, `staging-first`, `blue-green`, `canary`
   - `migrationPolicy` — one of: `non-destructive-only`, `destructive-allowed`, `manual-approval`
   - `authModel` — free text describing the auth approach
   - `routingTopology` — free text describing how traffic flows
   - `businessModel` — free text describing the revenue model
2. Log warnings for missing fields but do not block

### Done when

- Facts validated (warnings logged for missing fields)

---

## Step 3: Inject into Context

**Who:** Assigned agent
**Pause:** No

### Actions

1. Format the facts as a context block:
   ```markdown
   ## Project Facts

   - **Deployment:** {deploymentPosture}
   - **Migrations:** {migrationPolicy}
   - **Auth:** {authModel}
   - **Routing:** {routingTopology}
   - **Business Model:** {businessModel}
   ```
2. Include this block at the top of any planning or brainstorming output
3. If `deploymentPosture` is `greenfield-against-production`:
   - Enforce the standing production safety directives (no destructive migrations, backup before migrate, etc.)

### Done when

- Facts injected into the agent's working context
- Production safety directives activated if applicable

---

## Conventions

| Item | Convention |
|------|-----------|
| File path | `.flowstate/project-facts.json` |
| Missing file | Non-blocking; use defaults |
| Required fields | 5 core fields + optional `customFacts` |
| Production safety | Auto-activated when `deploymentPosture` = `greenfield-against-production` |
| Future migration | Will move to `project-facts-get/set` MCP tools when available |

---

_Created: 2026-04-12_
