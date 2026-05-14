---
name: flowstate-dojo-course-lifecycle
description: Use when an agent needs to create, update, publish, enroll in, test, or clean up Dojo courses/modules/items with `flowstate cloud dojo`, including temporary smoke courses and production content authoring - provides the canonical course lifecycle command sequence
---

# Dojo Course Lifecycle

**Status:** Active
**Purpose:** Run the course -> module -> item -> publish -> enroll -> progress lifecycle through the Dojo CLI
**Scope:** Production `flowstate cloud dojo` course authoring and validation
**Trigger:** Creating learning content, validating LMS CRUD, or cleaning temporary smoke content
**Prerequisite:** `flowstate-dojo-agent-session` health checks pass

---

## Lifecycle

```
Create course -> Create module -> Create item -> Publish -> Enroll -> Complete item -> Verify progress -> Cleanup
```

Use unique names/codes for temporary work:

```bash
STAMP=$(date -u +%Y%m%d%H%M%S)
COURSE_CODE="codex-smoke-$STAMP"
```

---

## Create and Read

```bash
COURSE_JSON=$(flowstate cloud dojo courses create \
  --name "Codex Smoke Course" \
  --code "$COURSE_CODE" \
  --description "Temporary Dojo smoke course" \
  --format self_paced \
  --category smoke \
  --tags codex,smoke \
  --allow-self-enrollment \
  --json)
COURSE_ID=$(printf '%s' "$COURSE_JSON" | jq -r '.id')

flowstate cloud dojo courses get "$COURSE_ID" --json | jq -e '.id == "'"$COURSE_ID"'"'
```

List courses:

```bash
flowstate cloud dojo courses list --limit 5 --json | jq '.data[] | {id,code,name,status}'
```

---

## Update

```bash
flowstate cloud dojo courses update "$COURSE_ID" \
  --description "Updated description" \
  --duration-hours 1 \
  --json
```

Course updates use `PUT /courses/{id}` under the hood and only mutate supplied fields.

---

## Modules

```bash
MODULE_JSON=$(flowstate cloud dojo modules create "$COURSE_ID" \
  --name "Module 1" \
  --description "Intro module" \
  --position 0 \
  --json)
MODULE_ID=$(printf '%s' "$MODULE_JSON" | jq -r '.id')

flowstate cloud dojo modules list "$COURSE_ID" --json | jq -e '.data[] | select(.id == "'"$MODULE_ID"'")'

flowstate cloud dojo modules update "$MODULE_ID" \
  --description "Updated module" \
  --position 1 \
  --json
```

There is no production `GET /modules/{id}` route. Retrieve module details from `modules list <courseId>` or mutation responses.

---

## Items

```bash
ITEM_JSON=$(flowstate cloud dojo items create "$MODULE_ID" \
  --type page \
  --title "Lesson 1" \
  --content "Temporary lesson content" \
  --position 0 \
  --completion-type view \
  --duration-minutes 1 \
  --required \
  --json)
ITEM_ID=$(printf '%s' "$ITEM_JSON" | jq -r '.id')

flowstate cloud dojo items update "$ITEM_ID" \
  --title "Lesson 1 Updated" \
  --content "Updated lesson content" \
  --json
```

Item types: `page`, `assignment`, `quiz`, `discussion`, `file`, `video`, `external_url`, `scorm`.

Completion types: `view`, `submit`, `score`, `manual`.

---

## Publish, Enroll, Progress

```bash
flowstate cloud dojo courses publish "$COURSE_ID" --json

flowstate cloud dojo enrollments enroll --course-id "$COURSE_ID" --json

flowstate cloud dojo enrollments list --limit 5 --json | jq '.data[] | select(.courseId == "'"$COURSE_ID"'")'

flowstate cloud dojo items complete "$ITEM_ID" --json
TOKEN=$(jq -r '.servers["cloud-pay"].auth.accessToken' ~/.flowstate/config.json)
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://api.epicflowstate.ai/dojo/courses/$COURSE_ID/progress" | jq
```

Use direct curl for `GET /courses/{id}/progress` until every installed CLI exposes a progress command.

---

## Cleanup

For temporary content, clean up in child-to-parent order:

```bash
flowstate cloud dojo items delete "$ITEM_ID" --json
flowstate cloud dojo modules delete "$MODULE_ID" --json
flowstate cloud dojo courses delete "$COURSE_ID" --json
```

Course and module delete operations archive/soft-delete. Item delete removes the item.

---

## Safety Rules

- Never run destructive commands on user-owned course IDs unless explicitly asked.
- For smoke tests, always use unique `codex-*` codes and clean up.
- Capture IDs from JSON output; do not infer or fabricate IDs.
- Publish only courses created for the task unless the user asked to publish an existing draft.

---

_Created: 2026-05-14_
