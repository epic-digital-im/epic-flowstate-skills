---
name: flowstate-dojo-production-smoke
description: Use after deploying `flowstate-dojo-api`, changing Dojo gateway/CLI contracts, or being asked to run production Dojo validation against `flowstate cloud dojo` - provides an end-to-end authenticated smoke checklist with cleanup and expected statuses
---

# Dojo Production Smoke

**Status:** Active
**Purpose:** Verify production Dojo API and CLI behavior after deploys or contract changes
**Scope:** `https://api.epicflowstate.ai/dojo` via `flowstate cloud dojo` and direct curl for routes not exposed by the installed CLI
**Trigger:** Dojo deploy completed, CLI auth confirmed, or production smoke requested
**Prerequisite:** User approval for production calls and `flowstate-dojo-agent-session` health checks pass

---

## Smoke Scope

Run:

1. OpenAPI surface check
2. Auth utility checks
3. URL metadata success and rejection checks
4. Course/module/item lifecycle
5. Enrollment/progress lifecycle
6. Team/community lifecycle
7. Cleanup verification

Use disposable names with UTC timestamps.

---

## OpenAPI Surface

```bash
curl -sS https://api.epicflowstate.ai/dojo/openapi.json \
  | jq '{openapi, pathCount: (.paths | length), paths: (.paths | keys)}'
```

Expected current surface includes:

- `/profile`
- `/tokens/balance`
- `/leads/subscribe`
- `/url-metadata`
- `/courses`
- `/courses/{courseId}/modules`
- `/modules/{id}` with `PUT` and `DELETE`
- `/modules/{moduleId}/items`
- `/module-items/{id}`
- `/module-items/{id}/complete`
- `/enrollments`
- `/teams`
- `/teams/{idOrSlug}`
- `/teams/{teamId}/members`
- `/teams/{teamId}/content`
- `/teams/{teamId}/events/{eventId}/linked-content`

Do not treat `GET /modules/{id}` as required; production does not expose it.

---

## Utility Checks

```bash
flowstate cloud dojo profile --json | jq -e '.id and .userId'
flowstate cloud dojo tokens --json | jq -e 'has("balance")'
flowstate cloud dojo courses list --limit 1 --json | jq -e 'has("data")'

flowstate cloud dojo lead-subscribe \
  --email "codex-prod-smoke+$(date -u +%Y%m%d%H%M%S)@epicdigital.media" \
  --name "Codex Production Smoke" \
  --source production-smoke \
  --json | jq -e '.success == true'

flowstate cloud dojo url-metadata https://example.com --json | jq -e '.url and .title'
```

Expected URL metadata rejections:

```bash
flowstate cloud dojo url-metadata 'https://user:pass@example.com/path' --json
# exits non-zero, returns JSON error status 400

flowstate cloud dojo url-metadata 'http://127.0.0.1/internal' --json
# exits non-zero, returns JSON error status 400
```

---

## Course Lifecycle Smoke

Use `flowstate-dojo-course-lifecycle` for command details. Required pass criteria:

| Check | Expected |
| ----- | -------- |
| Create course | `201`, returns `course_*` |
| Get course | `200` |
| Update course | `200` |
| Create module | `201`, returns `mod_*` |
| List modules | `200`, includes module |
| Update module | `200` |
| Create item | `201`, returns `item_*` |
| Publish course | `200` |
| Enroll | `200` or `201` |
| List enrollments | `200` |
| Complete item | `200` |
| Progress | `200`, use direct `GET /courses/{id}/progress` if CLI lacks command |
| Delete item | `204` |
| Delete module | `204` |
| Delete/archive course | `204` |

Always clean up child-to-parent.

---

## Team Lifecycle Smoke

Use `flowstate-dojo-team-community` for command details. Required pass criteria:

| Check | Expected |
| ----- | -------- |
| List teams | `200` |
| Create team with lowercase slug | `201`, returns `team_*` |
| Get team by id | `200` |
| Get team by slug | `200` |
| Update team name | `200` |
| List members | `200` |
| List content | `200` |
| List event linked content for nonexistent event | `200` empty list is acceptable |
| Delete team | `204` |

If `team_create` returns slug validation error, fix the smoke slug. Uppercase timestamp characters are invalid.

---

## Reporting Template

```text
Dojo production smoke: PASS/FAIL
Environment: https://api.epicflowstate.ai/dojo
Auth user: <userId or profileId, no token>
OpenAPI path count: <n>
Course smoke: <pass/fail, course id>
Team smoke: <pass/fail, team id>
Utility smoke: <pass/fail>
Cleanup: <confirmed/leftovers>
Notes:
- <unexpected behavior>
```

---

## Failure Triage

| Failure | Likely Cause | Next Action |
| ------- | ------------ | ----------- |
| OpenAPI `paths` empty/missing | Dojo API not deployed or gateway binding stale | Redeploy `flowstate-dojo-api` and gateway if needed |
| CLI auth fails but direct curl with token works | Installed CLI version mismatch | Check `flowstate --version`; use current CLI or publish/bump |
| Direct API route works but CLI command absent | CLI command surface lag | File CLI follow-up, use direct curl only for smoke |
| Plain text `404 Not Found` | Route absent at worker/router | Check OpenAPI; do not assume undocumented routes |
| Cleanup fails | Permission or cascade issue | Record IDs and retry; never hide leftovers |

---

_Created: 2026-05-14_
