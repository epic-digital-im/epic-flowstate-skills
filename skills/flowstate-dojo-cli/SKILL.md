---
name: flowstate-dojo-cli
description: Use when running, debugging, or extending `flowstate dojo *` or `flowstate cloud dojo *` commands, checking the Dojo LMS and skill/course catalog command trees, resolving auth/token errors, publishing package Dojo skills/courses, or mapping CLI verbs to Dojo OpenAPI routes - provides the canonical Dojo CLI reference and links to workflow skills for agents
---

# Dojo CLI Reference

**Status:** Active
**Purpose:** Canonical reference for the `flowstate dojo` and `flowstate cloud dojo` command trees, including LMS CRUD, skill catalog, course catalog, publisher, and package publish workflows.
**Scope:** Commands in `packages/flowstate-cli/src/cli-commands/dojo/` and the cloud wrapper in `cli-commands/cloud/dojo-subcommand.ts`
**Trigger:** Need to run Dojo LMS commands, publish package skills/courses, debug routing/auth, or build a new Dojo subcommand.

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
| `flowstate-package-dojo-sync` | Maintain package-local Dojo skill/course manifests and version lock rules |

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

## Skill And Course Catalog

The skill/course catalog and publisher commands are available under both `flowstate dojo` and `flowstate cloud dojo`. Prefer `flowstate cloud dojo` in authenticated docker/container agents.

Dojo has two intentionally different course command families:

- `courses` (plural) is LMS CRUD for live course records, modules, items, enrollment, and publish state.
- `course` (singular) is catalog packaging for publishing a versioned course artifact from `course.json`.

Use `courses ...` when operating on live LMS objects. Use `course publish <json-file>` when syncing package documentation into a versioned catalog course artifact.

| Command | Purpose |
| ------- | ------- |
| `skill list|get|validate|publish|install|update|list-installed` | Skill catalog and package skill publication commands |
| `publisher create|get` | Publisher management |
| `course list|get|publish` | Course catalog lookup and JSON course publication |
| `seed-epic-digital` | Bare `flowstate dojo` helper for Epic Digital seed setup |

Package docs audit uses local manifests under `packages/<package>/.flowstate/dojo`:

```bash
flowstate cloud dojo skill validate packages/<package>/.flowstate/dojo/skill.yaml
flowstate cloud dojo skill publish packages/<package>/.flowstate/dojo/skill.yaml
flowstate cloud dojo course publish packages/<package>/.flowstate/dojo/course.json
flowstate cloud dojo skill get flowstate-<package-slug> --json
flowstate cloud dojo course get flowstate-<package-slug>
```

The local validation command does not require a network call:

```bash
flowstate dojo skill validate packages/<package>/.flowstate/dojo/skill.yaml
```

`course.json` must match the generated `CoursePublishRequest` shape: `id`, `name`, `version`, `publisher`, optional `kind`, optional `description`, and optional `lessons[]` with `id`, `title`, `contentKind`, `content`, and `sortOrder`.

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

## Common Errors

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `Missing Dojo API token` | No `cloud-pay` profile or explicit token | Run `flowstate cloud login` or use `flowstate-dojo-agent-session` |
| `Not authenticated with FlowState Cloud` | Missing/expired cloud auth | Re-run `flowstate cloud login` |
| `Not authenticated. Run \`flowstate auth wallet\`` | Skill/catalog client could not find auth and no cloud override was active | Prefer `flowstate cloud dojo ...` after `flowstate cloud login`, or provide `--auth-file` for legacy wallet auth |
| `Manifest validation failed locally` | `skill.yaml` does not match the canonical Dojo skill schema | Run `flowstate dojo skill validate <file>` and fix `apiVersion`, `kind`, `metadata`, or `spec` fields before publish |
| `Skill version already exists` | `metadata.id` and `metadata.version` were already published | Confirm package version; bump package version only when package/docs/skill content should publish a new catalog version |
| `401 Missing Authorization header` | Calling production `/dojo/*` without cloud wrapper/token | Use `flowstate cloud dojo`, not direct unauthenticated curl |
| `404 Not Found` with plain text | Route is not deployed or command assumes a route that does not exist | Check `https://api.epicflowstate.ai/dojo/openapi.json` |
| `403 Forbidden` | Caller is not owner/admin/member for that operation | Verify profile/team/course ownership |
| `slug must be 2-60 chars...` | Team slug invalid | Use lowercase letters, digits, hyphens only |
| `URL must not include credentials` | Metadata URL contained `user:pass@` | Strip credentials before calling |
| `URL host is not allowed` | Metadata URL points to local/private host | Use a public HTTP(S) URL |
| `Error: fetch failed` | Overwatch MITM blocks `api.epicflowstate.ai` | Add the host to NO_PROXY (see `flowstate-agent-cli-bootstrap`) |
| `Unexpected non-JSON response from MCP server: ...` | Wrong endpoint (calling MCP instead of dojo gateway) | Use `flowstate cloud dojo` (not bare `flowstate dojo` if you intend production) |

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

Related references:

- `flowstate-cli-cloud-auth` — how `cloud-pay` JWT gets minted (the preferred token source)
- `flowstate-cli-wallet-auth` — agent containers using SAGA wallet to log in
- `flowstate-cloud-gateway-routing` — `/dojo/*` route specifics
- `flowstate-package-dojo-sync` — package-local Dojo skill/course manifests and version lock rules
- Generated OpenAPI types: `packages/flowstate-cli/src/generated/dojo/types.ts` (regenerate via the `yarn generate:types` script when the spec changes)

---

_Created: 2026-05-04_
_Updated: 2026-05-14_
