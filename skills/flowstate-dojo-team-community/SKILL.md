---
name: flowstate-dojo-team-community
description: Use when an agent needs to create, update, inspect, or clean up Dojo teams, memberships, invitations, team content, events, attendees, or join requests through `flowstate cloud dojo teams` - provides the canonical team/community command workflows
---

# Dojo Team and Community Workflows

**Status:** Active
**Purpose:** Operate Dojo team, membership, invitation, content, and event commands safely
**Scope:** `flowstate cloud dojo teams *`
**Trigger:** Managing teams, validating community endpoints, or authoring team content
**Prerequisite:** `flowstate-dojo-agent-session` health checks pass

---

## Team CRUD

Create a temporary or real team:

```bash
STAMP=$(date -u +%Y%m%d%H%M%S)
TEAM_SLUG="codex-team-$STAMP"

TEAM_JSON=$(flowstate cloud dojo teams create \
  --name "Codex Team" \
  --slug "$TEAM_SLUG" \
  --json)
TEAM_ID=$(printf '%s' "$TEAM_JSON" | jq -r '.id')
```

Slug rules:

- 2-60 chars
- lowercase letters, digits, hyphens
- no leading or trailing hyphen

Read/update/list/delete:

```bash
flowstate cloud dojo teams list --mine --json
flowstate cloud dojo teams get "$TEAM_ID" --json
flowstate cloud dojo teams get "$TEAM_SLUG" --json
flowstate cloud dojo teams update "$TEAM_ID" --name "Codex Team Updated" --json
flowstate cloud dojo teams delete "$TEAM_ID" --json
```

Deleting a team cascades members, invitations, requests, and content.

---

## Members

```bash
flowstate cloud dojo teams members list "$TEAM_ID" --json

flowstate cloud dojo teams members add "$TEAM_ID" \
  --profile "$PROFILE_ID" \
  --role member \
  --json

flowstate cloud dojo teams members role "$TEAM_ID" "$PROFILE_ID" \
  --role admin \
  --json

flowstate cloud dojo teams members remove "$TEAM_ID" "$PROFILE_ID"
```

Use either `--profile <profileId>` or `--wallet <address>` when adding a member. Owner/admin permissions apply.

---

## Invitations and Join Requests

Owner/admin invite:

```bash
flowstate cloud dojo teams invite "$TEAM_ID" \
  --email user@example.com \
  --role member \
  --json

flowstate cloud dojo teams invitations list "$TEAM_ID" --json
flowstate cloud dojo teams invitations revoke "$TEAM_ID" "$INVITATION_ID"
```

Invitee:

```bash
flowstate cloud dojo teams my-invitations --json
flowstate cloud dojo teams invitations accept "$INVITATION_ID" --json
flowstate cloud dojo teams invitations decline "$INVITATION_ID"
```

Self-request flow:

```bash
flowstate cloud dojo teams request "$TEAM_ID" --json
flowstate cloud dojo teams requests "$TEAM_ID" --json
```

---

## Team Content

List and get:

```bash
flowstate cloud dojo teams content list "$TEAM_ID" --json
flowstate cloud dojo teams content get "$TEAM_ID" "$CONTENT_ID" --json
```

Create a post:

```bash
POST_JSON=$(flowstate cloud dojo teams content add "$TEAM_ID" \
  --type post \
  --title "Status Update" \
  --description "Team update body" \
  --json)
POST_ID=$(printf '%s' "$POST_JSON" | jq -r '.id')
```

Create an event:

```bash
EVENT_JSON=$(flowstate cloud dojo teams content add "$TEAM_ID" \
  --type event \
  --title "Office Hours" \
  --event-date "2026-05-15T17:00:00.000Z" \
  --event-end-date "2026-05-15T18:00:00.000Z" \
  --json)
EVENT_ID=$(printf '%s' "$EVENT_JSON" | jq -r '.id')
```

Create a link:

```bash
flowstate cloud dojo teams content add "$TEAM_ID" \
  --type link \
  --title "Reference" \
  --url "https://example.com" \
  --json
```

Update/delete:

```bash
flowstate cloud dojo teams content update "$TEAM_ID" "$POST_ID" \
  --title "Status Update Revised" \
  --json

flowstate cloud dojo teams content remove "$TEAM_ID" "$POST_ID"
```

---

## Events and Attendees

Join or leave an event content item:

```bash
flowstate cloud dojo teams attendees join "$TEAM_ID" "$EVENT_ID" --json
flowstate cloud dojo teams attendees leave "$TEAM_ID" "$EVENT_ID" "$PROFILE_ID"
```

List content linked to an event:

```bash
flowstate cloud dojo teams events "$TEAM_ID" --event-id "$EVENT_ID" --json
```

---

## Safety Rules

- Capture team/profile/content IDs from JSON responses.
- Do not delete user teams unless explicitly instructed.
- For smoke tests, create a disposable `codex-*` team and delete it at the end.
- Validate slugs locally before calling production.

---

_Created: 2026-05-14_
