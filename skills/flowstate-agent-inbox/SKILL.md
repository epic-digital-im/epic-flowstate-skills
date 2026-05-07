---
name: flowstate-agent-inbox
description: Use at the start of every agent heartbeat (and any time a human caller wants to know what's on their plate) to triage all action items - active tasks, mentions on tasks/projects/milestones, replies to your discussions, unread agent-to-agent conversations, and pending approvals where you're the approver. Provides the canonical single-command scan + per-section triage rules with the exact MCP / CLI follow-up commands so the caller can act on every surfaced ID without guessing.
---

# Agent Inbox

**Status:** Active
**Purpose:** Single-pass scan + triage of an agent's actionable items every heartbeat
**Scope:** All FlowState agents, every heartbeat invocation
**Trigger:** Heartbeat fires (or any time the agent wants to know "what should I work on next?")
**Input:** None — identity comes automatically from the active auth token. The same command serves humans (user JWT) and agents (service-account token).
**Output:** Sections visited, statuses updated, replies/messages posted, next-action queue clear

---

## Overview

Every heartbeat begins with **one** inbox scan and triage. The single-command scan returns four sections — each one maps to a fixed set of next-actions. Don't try to track read-state in your head; the inbox window does that for you (only items in the window appear).

```
flowstate inbox --since 1h
        │
        ├─ Active tasks         →  continue In Progress / pick highest-priority Planned
        ├─ Mentions             →  read context, reply if warranted (collection-create discussions)
        ├─ Replies              →  read context, respond if warranted (chain via parentDiscussionId)
        ├─ Conversations        →  flowstate agent conversation show <id>; respond if needed
        ├─ Approvals            →  read context, respond (collection-update approvals { status, ... })
        └─ Description mentions →  read entity, post a discussions reply on it if warranted
```

---

## Step 1: Scan the inbox

Run exactly this:

```bash
flowstate inbox --since 1h
```

| Heartbeat cadence       | Suggested `--since` |
| ----------------------- | ------------------- |
| Routine (every ~10 min) | `1h`                |
| Catch-up (missed beats) | `6h` or `1d`        |
| First scan of the day   | `7d` (the default)  |

The output has four sections + a `🔧 Action paths` footer. Read the **footer first** so you know the canonical commands for each item type, then go top-to-bottom through the sections.

**IDs are always shown in full.** Copy them verbatim — never truncate, never re-construct from the section header. The renderer prints `proj_<12char>`, `task_<12char>`, `disc_<random>`, `conv_<12char>` exactly as MCP tools accept them.

---

## Step 2: Triage `📋 Active tasks`

For each task row (`[P<priority>] <task_id> <title> · <status> · <relative-time>`):

| Status        | Action                                                                          |
| ------------- | ------------------------------------------------------------------------------- |
| `In Progress` | Continue work via `flowstate-task-execution` — do not pick up anything else     |
| `Planned`     | If priority ≥ 3 (P3 or higher), start it via `flowstate-task-execution`         |
| `Blocked`     | Check whether the blocker resolved; if yes, unblock + restart                   |
| `Complete`    | No-op — should not appear in inbox; if it does, refresh                         |

**Hard rule: at most one active task per heartbeat.** If anything is `In Progress`, that's your task — do not start a second Planned item. Split focus = no progress on either.

To pull task context before working on it:

```
collection-get tasks <task_id> orgId=<from .flowstate/config.json>
```

---

## Step 3: Triage `💬 Mentions`

Each mention row looks like:

```
@<author> on <entityId> (<discussionId>): "<snippet>"  · <time> [→ <relatedTaskId> in your queue]
```

For each mention:

1. **Pull discussion context** so you see the full message (the inbox shows a snippet only):
   ```
   collection-get discussions <discussionId> orgId=<from config>
   ```
2. **Pull entity context** so you understand what's being discussed. The collection is inferred from the `entityId` prefix:
   - `task_…` → `collection-get tasks <entityId>`
   - `proj_…` → `collection-get projects <entityId>`
   - `mile_…` → `collection-get milestones <entityId>`
3. **Decide** — reply, escalate to a teammate, or no-op.
4. **If replying**, post a reply discussion with `parentId` set to the mention's `discussionId`:
   ```
   collection-create discussions {
     entityType: "<task|project|milestone>",
     entityId: "<entityId from the mention row>",
     parentId: "<discussionId from the mention row>",
     content: "<your reply>",
     userName: "<your characterName from agent metadata>",
     userId: "<your teamMemberId from agent metadata>",
     orgId: "<from .flowstate/config.json>",
     workspaceId: "<from .flowstate/config.json>",
     threadDepth: 1,
     isEdited: false,
     isDeleted: false
   }
   ```

If the mention has a `[→ task_… in your queue]` xref, the same item also appears in your Active Tasks section — process it once, in whichever section makes the action concrete.

---

## Step 4: Triage `↩️ Replies`

Each reply row looks like:

```
@<author> replied to your comment (<discussionId> → <parentDiscussionId>): "<snippet>"  · <time>
```

The arrow notation means: **`discussionId`** is the new reply itself; **`parentDiscussionId`** is the thread root you originally posted in.

For each reply:

1. **Pull thread context** (the original thread, not just the new reply):
   ```
   collection-get discussions <parentDiscussionId> orgId=<from config>
   ```
2. **Read the new reply in full**:
   ```
   collection-get discussions <discussionId> orgId=<from config>
   ```
3. **Decide** — respond or no-op.
4. **If responding**, chain to the **thread root** (`parentDiscussionId`), NOT the reply's own id:
   ```
   collection-create discussions {
     ...,
     parentId: "<parentDiscussionId>",   ← the thread root, NOT discussionId
     content: "<your response>",
     threadDepth: 1,
     ...
   }
   ```
   Using the reply's own id as `parentId` creates a sub-thread under that one reply, which fragments the conversation. Always chain to the root.

---

## Step 5: Triage `🗨️ Conversations`

Each conversation row looks like:

```
<conversationId> · <title> (<turnsUsed> of <maxTurns> turns) [closed: <reason>?] — <author>: "<preview>"  · <time> [⚡ @you, muted]
```

For each conversation, especially those with `unreadCount > 0` (the section header counts these):

1. **Open the thread**:
   ```bash
   flowstate agent conversation show <conversationId>
   ```
2. **Read the unread messages.**
3. **Decide** — respond or no-op.
4. **If responding**:
   ```bash
   flowstate agent conversation message <conversationId> "your reply"
   ```

**Status flags to respect:**

| Flag                 | Behavior                                                                          |
| -------------------- | --------------------------------------------------------------------------------- |
| `[closed: <reason>]` | Read-only. Server WILL reject writes — don't burn the call.                       |
| `[muted]`            | New messages still surface. Respond only if you're @-mentioned (`⚡ @you`).        |
| `(N of M turns ⚠️)`  | Soft-cap exceeded — the conversation will close after the next turn. Wrap up.     |

---

## Step 6: Triage `✋ Approvals`

Each approval row looks like:

```
<appr_id> · "<title>": "<snippet>" — <CategoryName> · <type> · <time> [→ <related-entity-id>]
```

Pending approvals don't expire on the lookback window — anything where you're the
`approverId` and `status === 'pending'` shows here regardless of how old it is.

For each approval:

1. **Pull the approval record** for the full request:
   ```
   collection-get approvals <appr_id> orgId=<from config>
   ```
2. **Pull the related entity context** (most-specific id is the xref shown in
   `[→ ...]`):
   ```
   collection-get <projects|milestones|tasks|documents> <related-id>
   ```
3. **Read the linked document content** if `documentId` is set on the approval
   (often the spec / proposal being approved).
4. **Decide**: approve, request revision, or reject.
5. **Respond** by updating the approval — the underlying skill's flow polls
   for `status` to flip:
   ```
   collection-update approvals <appr_id> {
     status: "approved" | "needs-revision" | "rejected",
     response: "<optional short note>",
     comments: "<optional longer feedback or revision asks>",
     respondedAt: "<current ISO timestamp>"
   }
   ```

**Status semantics:**

| Status            | Meaning                                                                            |
| ----------------- | ---------------------------------------------------------------------------------- |
| `approved`        | Workflow proceeds to the next step.                                                |
| `needs-revision`  | Requester must address `comments` and re-submit; workflow stays paused.            |
| `rejected`        | Workflow halts; requester decides whether to abandon or restart from an earlier step. |

The `category` field (Brainstorming / Planning / etc.) tells you which skill
flow is blocked on your decision — useful for prioritizing.

---

## Step 7: Triage `📌 Description mentions`

Each description-mention row looks like:

```
<entityId> · "<entity title>": "<description snippet>"  · <time>
```

These are @-mentions found in the `description` field of a task, milestone,
or project — distinct from `Mentions` (which scans `discussions`). The
action shape is different too: to clear a description-mention you typically
post a `discussions` reply on the entity, not edit the description.

**Forward-only:** only entities updated AFTER the worker write hook landed
(2026-05-06) appear here. Older entities whose descriptions contain your
@-handle are NOT scanned retroactively. The empty-state line in the section
spells this out.

For each description-mention:

1. **Pull the entity** for the full description (snippet is 200 chars):
   ```
   collection-get <tasks|milestones|projects> <entityId>
   ```
   (collection inferred from the id prefix: `task_` → `tasks`,
   `mile_` → `milestones`, `proj_` → `projects`)
2. **Decide**: reply on the entity, take action, or no-op.
3. **If replying**, post a discussion on the entity (NOT an edit to its
   description). The `entityType` shown in the inbox row is what the
   discussion needs:
   ```
   collection-create discussions {
     entityType: "<task|milestone|project>",
     entityId: "<entityId from the row>",
     content: "<your reply, can re-@-mention people>",
     userName: "<your characterName>",
     userId: "<your teamMemberId>",
     orgId: "<from config>",
     workspaceId: "<from config>",
     threadDepth: 0,
     isEdited: false,
     isDeleted: false
   }
   ```

---

## Done When

- Every section header has been read (even if the count is 0)
- Any started Planned task has its status flipped to `In Progress`
- Any mentions/replies you chose to respond to have a posted discussion (verify via `collection-query discussions`)
- Any conversations you chose to respond to have a posted message (verify via `flowstate agent conversation show`)
- Any approvals you chose to act on have `status` flipped from `pending` (verify via `collection-get approvals <id>`)
- Any description-mentions you chose to address have either a posted reply discussion on the entity OR an explicit "no-op for now" decision
- You can answer "what am I working on right now?" with one task ID

---

## Red Flags — STOP

- **Truncating IDs** to fit a CLI command. The inbox always prints full IDs. Copy verbatim.
- **Replying to a closed conversation.** `[closed: ...]` is a hard server-side gate; the call will fail.
- **Picking up multiple Planned tasks** in one heartbeat. One active task at a time.
- **Skipping a section "because it's empty"** without reading the count. Read the header — `(0)` confirms empty; absence of content does not.
- **Using `discussionId` as `parentId`** for a reply. That fragments the thread. Use `parentDiscussionId`.
- **Constructing IDs by hand** (e.g. concatenating `entityType + "_" + suffix`). All IDs come from the inbox output, MCP responses, or `.flowstate/config.json` — never hand-built.
- **Sitting on a `pending` approval** because "the requester didn't ping me." Most workflows are blocked until you respond. If you can't decide right now, post a `needs-revision` with what you're waiting on so the requester can act.

---

## Rationalization Table

| Excuse                                                | Reality                                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| "I already saw this mention last heartbeat"           | The inbox window is the source of truth. If it's still in the window, it may still be unaddressed. Re-check, don't skip. |
| "The conversation is closed, I'll just send a quick note anyway" | Server rejects the write. The note never lands. Read for context only.                                                  |
| "I'll batch all the Planned tasks together"           | Split focus = no completed work. Take one. Finish it. Then the next heartbeat picks the next.                            |
| "I don't need full context, the snippet is enough"    | Snippets are 80–120 chars. Decisions made on snippets misfire ~50% of the time. Pull `collection-get discussions <id>`.   |

---

## Conventions

| Item                | Convention                                                              |
| ------------------- | ----------------------------------------------------------------------- |
| Default window      | `--since 1h` for routine heartbeats; widen if you missed beats          |
| ID format           | Always full (`task_<12>`, `proj_<12>`, `mile_<12>`, `disc_<random>`, `conv_<12>`, `appr_<random>`) — never truncate |
| Reply parent        | Use `parentDiscussionId` (the thread root), NOT the reply's own `discussionId`        |
| Conversation writes | `flowstate agent conversation message <id> "..."` (NOT `show`)          |
| Approval response   | `collection-update approvals <id> { status, response, comments, respondedAt }` — `status` must be one of `approved` / `needs-revision` / `rejected` |
| Approval window     | NOT subject to `--since` — pending approvals always surface, regardless of age |
| Active tasks        | At most one `In Progress` task per agent at a time                      |
| Closed conversations | Read-only; do not attempt to post                                      |
| Muted conversations | Respond only on @-mention                                              |

---

## Cross-References

- `flowstate-task-execution` — invoked when picking up a Planned task
- `flowstate-pre-flight-check` — invoked before any new entity creation
- `flowstate-approval-workflow` — when a triage decision needs human sign-off

---

_Created: 2026-05-06_
