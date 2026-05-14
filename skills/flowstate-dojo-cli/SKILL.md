---
name: flowstate-dojo-cli
description: Use when running, debugging, or extending `flowstate dojo *` or `flowstate cloud dojo *` commands, checking the Dojo LMS command tree, resolving auth/token errors, or mapping CLI verbs to Dojo OpenAPI routes - provides the canonical Dojo CLI reference and links to workflow skills for agents
---

# Dojo LMS CLI Reference

**Status:** Active
**Purpose:** Canonical reference for the `flowstate dojo` and `flowstate cloud dojo` command trees
**Scope:** Commands in `packages/flowstate-cli/src/cli-commands/dojo/` and the cloud wrapper in `cli-commands/cloud/dojo-subcommand.ts`
**Trigger:** Need to run Dojo LMS commands, debug routing/auth, or build a new Dojo subcommand

---

## Overview

Use `flowstate cloud dojo` for production. It injects the production gateway URL and reads the `cloud-pay` JWT created by `flowstate cloud login`.

| Tree | Token source | API URL |
| ---- | ------------ | ------- |
| `flowstate cloud dojo *` | `~/.flowstate/config.json` `servers["cloud-pay"].auth.accessToken` | `https://api.epicflowstate.ai/dojo` |
| `flowstate dojo *` | `--token` -> `FLOWSTATE_DOJO_TOKEN` -> config `.dojo.token` | `--api-url` -> `FLOWSTATE_DOJO_URL` -> config `.dojo.apiUrl` -> production |

Gateway path mapping:

```
flowstate cloud dojo courses list
  -> https://api.epicflowstate.ai/dojo/courses
  -> gateway strips /dojo
  -> DOJO_API_SERVICE receives /courses
```

All production `/dojo/*` routes are JWT-gated at the gateway, including utility routes.

---

## Related Agent Skills

Use these workflow skills instead of re-deriving command sequences:

| Skill | Use |
| ----- | --- |
| `flowstate-dojo-agent-session` | Authenticate and verify a Dojo-capable agent shell |
| `flowstate-dojo-course-lifecycle` | Create/manage courses, modules, items, enrollment, progress |
| `flowstate-dojo-team-community` | Create/manage teams, members, invitations, content, events |
| `flowstate-dojo-production-smoke` | Run production API/CLI smoke after deploys |

---

## Command Surface

Prefer `--json` for agent work so results can be parsed with `jq`.

### Utility

| Command | Route | Notes |
| ------- | ----- | ----- |
| `profile --json` | `GET /profile` | Requires human cloud auth; bootstraps profile if missing |
| `tokens --json` | `GET /tokens/balance` | Returns `{ userId, balance }` |
| `lead-subscribe --email <email> [--name <name>] [--source <source>] --json` | `POST /leads/subscribe` | Public upstream route, still gateway JWT-gated in production |
| `url-metadata <url> --json` | `GET /url-metadata` | Rejects URL credentials and local/private hosts |

### Courses

| Command | Route | Notes |
| ------- | ----- | ----- |
| `courses list [--status <status>] [--search <q>] [--page <n>] [--limit <n>] --json` | `GET /courses` | Returns paginated `{ data, total, page, limit, hasMore }` |
| `courses create --name <name> [--code <code>] [--description <desc>] [--format self_paced|instructor_led|blended] [--category <cat>] [--tags a,b] [--allow-self-enrollment] --json` | `POST /courses` | Caller becomes instructor/owner |
| `courses get <courseIdOrCode> --json` | `GET /courses/{id}` | Accepts id or code where backend supports it |
| `courses update <courseId> [flags] --json` | `PUT /courses/{id}` | Replaces supplied fields only |
| `courses publish <courseId> --json` | `POST /courses/{id}/publish` | Required before self-enrollment |
| `courses delete <courseId> --json` | `DELETE /courses/{id}` | Archives/soft-deletes; JSON output is `{}` or command wrapper metadata |

### Modules

| Command | Route | Notes |
| ------- | ----- | ----- |
| `modules list <courseId> [--page <n>] [--limit <n>] [--search <q>] --json` | `GET /courses/{courseId}/modules` | Use this to retrieve module ids |
| `modules create <courseId> --name <name> [--description <desc>] [--position <n>] [--prerequisites a,b] [--require-sequential] --json` | `POST /courses/{courseId}/modules` | Creates a draft module |
| `modules update <moduleId> [--name <name>] [--description <desc>] [--position <n>] [--require-sequential true|false] --json` | `PUT /modules/{id}` | There is no production `GET /modules/{id}` route |
| `modules delete <moduleId> --json` | `DELETE /modules/{id}` | Archives/soft-deletes |

### Items

| Command | Route | Notes |
| ------- | ----- | ----- |
| `items create <moduleId> --type page|assignment|quiz|discussion|file|video|external_url|scorm --title <title> [--content <content>] [--position <n>] [--completion-type view|submit|score|manual] [--duration-minutes <n>] [--required] --json` | `POST /modules/{moduleId}/items` | Creates module content |
| `items update <itemId> [flags] --json` | `PUT /module-items/{id}` | Updates supplied fields |
| `items complete <itemId> --json` | `POST /module-items/{id}/complete` | Marks item complete for authenticated user |
| `items delete <itemId> --json` | `DELETE /module-items/{id}` | Hard-deletes item |

The current CLI does not expose `items list` or `items get` commands. Use course/module responses or direct API smoke only when necessary.

### Enrollments

| Command | Route | Notes |
| ------- | ----- | ----- |
| `enrollments list [--status active|completed|dropped|expired] [--page <n>] [--limit <n>] --json` | `GET /enrollments` | Authenticated user only |
| `enrollments enroll --course-id <courseId> --json` | `POST /courses/{id}/enroll` | Works after course is published and self-enrollment is allowed |

### Teams

| Command | Route | Notes |
| ------- | ----- | ----- |
| `teams create --name <name> --slug <slug> --json` | `POST /teams` | Slug: lowercase letters, digits, hyphens; 2-60 chars; no leading/trailing hyphen |
| `teams list [--mine] --json` | `GET /teams` | `--mine` filters to memberships |
| `teams get <idOrSlug> --json` | `GET /teams/{idOrSlug}` | Accepts id or slug |
| `teams update <idOrSlug> --name <name> --json` | `PATCH /teams/{idOrSlug}` | Owner only |
| `teams delete <idOrSlug> --json` | `DELETE /teams/{idOrSlug}` | Owner only; cascades members, invitations, content |
| `teams members list <idOrSlug> --json` | `GET /teams/{teamId}/members` | Team members only |
| `teams members add <idOrSlug> (--profile <profileId> | --wallet <address>) [--role member|admin] --json` | `POST /teams/{teamId}/members` | Owner/admin only |
| `teams members role <idOrSlug> <profileId> --role member|admin --json` | `PATCH /teams/{teamId}/members/{profileId}` | Owner only |
| `teams members remove <idOrSlug> <profileId>` | `DELETE /teams/{teamId}/members/{profileId}` | Owner/admin rules apply |
| `teams invite <idOrSlug> (--email <email> | --wallet <address>) [--role member|admin] --json` | `POST /teams/{teamId}/invitations` | Owner/admin only |
| `teams invitations list <idOrSlug> --json` | `GET /teams/{teamId}/invitations` | Owner/admin only |
| `teams invitations accept <invitationId> --json` | `POST /invitations/{invitationId}/accept` | Invitee-facing |
| `teams my-invitations --json` | `GET /invitations/mine` | Current user invitations |
| `teams request <idOrSlug> --json` | `POST /teams/{teamId}/requests` | Request to join |
| `teams requests <idOrSlug> --json` | `GET /teams/{teamId}/requests` | Owner/admin only |
| `teams content list <idOrSlug> --json` | `GET /teams/{teamId}/content` | Members only |
| `teams content add <idOrSlug> --type post|event|link --title <title> [...] --json` | `POST /teams/{teamId}/content` | Events require `--event-date` |
| `teams content update <idOrSlug> <contentId> [flags] --json` | `PATCH /teams/{teamId}/content/{contentId}` | Creator/admin/owner |
| `teams content remove <idOrSlug> <contentId>` | `DELETE /teams/{teamId}/content/{contentId}` | Creator/admin/owner |
| `teams attendees join <idOrSlug> <contentId> --json` | `POST /teams/{teamId}/content/{contentId}/attendees` | Event content only |
| `teams attendees leave <idOrSlug> <contentId> <profileId>` | `DELETE /teams/{teamId}/content/{contentId}/attendees/{profileId}` | Self/admin/owner |
| `teams events <idOrSlug> --event-id <contentId> --json` | `GET /teams/{teamId}/events/{eventId}/linked-content` | Lists content linked to an event |

---

## Output Contracts

Use `jq` defensively because some commands return paginated lists and some return single records:

```bash
flowstate cloud dojo courses list --limit 1 --json | jq '.data[0].id'
flowstate cloud dojo profile --json | jq -r '.id'
flowstate cloud dojo url-metadata https://example.com --json | jq '{url,title}'
```

Successful empty deletes should be treated as success by exit code and HTTP status. Modern CLI builds return JSON-safe `{}` for empty 2xx responses.

---

## Common Errors

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `Missing Dojo API token` | No `cloud-pay` profile or explicit token | Run `flowstate cloud login` or use `flowstate-dojo-agent-session` |
| `Not authenticated with FlowState Cloud` | Missing/expired cloud auth | Re-run `flowstate cloud login` |
| `401 Missing Authorization header` | Calling production `/dojo/*` without cloud wrapper/token | Use `flowstate cloud dojo`, not direct unauthenticated curl |
| `404 Not Found` with plain text | Route is not deployed or command assumes a route that does not exist | Check `https://api.epicflowstate.ai/dojo/openapi.json` |
| `403 Forbidden` | Caller is not owner/admin/member for that operation | Verify profile/team/course ownership |
| `slug must be 2-60 chars...` | Team slug invalid | Use lowercase letters, digits, hyphens only |
| `URL must not include credentials` | Metadata URL contained `user:pass@` | Strip credentials before calling |
| `URL host is not allowed` | Metadata URL points to local/private host | Use a public HTTP(S) URL |

---

## Verification

Minimum healthy production checks:

```bash
flowstate cloud dojo profile --json | jq -e '.id and .userId'
flowstate cloud dojo tokens --json | jq -e 'has("balance")'
flowstate cloud dojo courses list --limit 1 --json | jq -e 'has("data")'
flowstate cloud dojo url-metadata https://example.com --json | jq -e '.url and .title'
```

For post-deploy validation, use `flowstate-dojo-production-smoke`.

---

_Created: 2026-05-04_
_Updated: 2026-05-14_
