---
name: flowstate-timetracking
description: Use when starting ANY task work, completing ANY task, or needing to track agent effort - enforces time entry creation before work begins and time entry completion when work ends. All tasks require time tracking without exception.
---

# Time Tracking

**Status:** Active
**Purpose:** Every task execution MUST have time tracked — start before work begins, stop when work completes
**Scope:** All task execution, subagent work, code review, debugging, planning — any billable effort
**Trigger:** Before starting any task work AND after completing any task work
**Input:** Task ID, agent identity (teamMemberId from `flowstate-agent-identity`)
**Output:** Time entry with accurate start/end times and duration

---

## Iron Law

```
NO TASK WORK WITHOUT AN ACTIVE TIME ENTRY.
NO TASK COMPLETION WITHOUT STOPPING THE TIME ENTRY.
```

If you haven't started a timer, you cannot start working.
If you haven't stopped the timer, you cannot claim the task is complete.

---

## Time Entry Schema

Collection: `timeentries`
ID Prefix: `time_`

| Field         | Type    | Required | Description                                                |
| ------------- | ------- | -------- | ---------------------------------------------------------- |
| `id`          | string  | Yes      | Auto-generated: `time_XXXXXXXXXX`                          |
| `name`        | string  | Yes      | Description of work (max 500 chars)                        |
| `taskId`      | string  | Yes      | Entity ID being worked on (task, milestone, project, etc.) |
| `userId`      | string  | Yes      | **Agent's teamMemberId** — from `flowstate-agent-identity` |
| `orgId`       | string  | Yes      | Organization ID — from parent entity                       |
| `workspaceId` | string  | No       | Workspace ID — from parent entity                          |
| `startAt`     | string  | Yes      | ISO datetime when work began                               |
| `endAt`       | string  | No       | ISO datetime when work ended (empty = active timer)        |
| `duration`    | number  | No       | Duration in seconds (calculated: endAt - startAt)          |
| `categoryId`  | string  | No       | Optional category reference                                |
| `tagIds`      | array   | No       | Optional tag references                                    |
| `archived`    | boolean | Yes      | Soft delete flag (default: false)                          |
| `createdAt`   | string  | Yes      | ISO datetime                                               |
| `updatedAt`   | string  | Yes      | ISO datetime                                               |
| `metadata`    | object  | No       | Custom metadata                                            |

**Active Timer:** An entry with `startAt` set but NO `endAt` — indicates work in progress.

---

## Workflow

```
Start Timer → Do Work → Stop Timer → Verify Entry
     (1)         (2)        (3)          (4)
```

---

## Step 1: Start Timer (Before ANY Work)

**Who:** Agent performing the work
**When:** BEFORE writing any code, running any commands, or making any changes

### Actions

1. **Load agent identity** (via `flowstate-agent-identity` skill)
2. **Get parent entity** to resolve orgId/workspaceId
3. **Create time entry** with `startAt` set to current time, NO `endAt`

```javascript
// Get current ISO time
const now = new Date().toISOString()

// Create active timer
mcp__epic-flowstate__collection-create({
  collection: "timeentries",
  orgId: "<from parent entity>",
  data: {
    name: "<description of work being performed>",
    taskId: "<task ID being worked on>",
    userId: "<agent's teamMemberId>",
    orgId: "<from parent entity>",
    workspaceId: "<from parent entity>",
    startAt: now,
    // endAt intentionally omitted — active timer
    archived: false
  }
})
```

4. **Record the time entry ID** — you need it to stop the timer later

### Done When

- Time entry created with `startAt` set
- Time entry ID recorded for later update
- **Only then** may work begin

---

## Step 2: Do Work

Perform the actual task. The timer is running.

If the task involves multiple sub-steps or subagents, the timer covers the entire effort.

---

## Step 3: Stop Timer (After Work Completes)

**Who:** Agent that started the timer
**When:** AFTER work is verified complete (tests pass, review done, etc.)

### Actions

1. **Calculate duration** in seconds
2. **Update the time entry** with `endAt` and `duration`

```javascript
const endTime = new Date().toISOString()

// Calculate duration in seconds
// (In practice, compute from startAt to endTime)

mcp__epic-flowstate__collection-update({
  collection: "timeentries",
  id: "<time entry ID from Step 1>",
  orgId: "<from parent entity>",
  data: {
    endAt: endTime,
    duration: <seconds between startAt and endAt>,
    updatedAt: endTime
  }
})
```

### Done When

- Time entry has both `startAt` and `endAt` set
- Duration calculated and recorded
- Timer is no longer active

---

## Step 4: Verify Entry

**Who:** Agent that performed the work
**When:** After stopping the timer

### Actions

1. **Query the time entry** to confirm it was saved correctly
2. **Verify duration is reasonable** — flag if suspiciously short (< 60s) or long (> 8 hours)

```javascript
mcp__epic-flowstate__collection-get({
  collection: "timeentries",
  id: "<time entry ID>",
  orgId: "<orgId>"
})
```

### Done When

- Entry confirmed with startAt, endAt, duration, userId, taskId all populated

---

## Timer Name Conventions

The `name` field should describe the work performed:

| Work Type           | Name Format                       | Example                             |
| ------------------- | --------------------------------- | ----------------------------------- |
| Task implementation | `Implement: <task title>`         | `Implement: Add user auth flow`     |
| Code review         | `Review: <what was reviewed>`     | `Review: PR #42 auth changes`       |
| Debugging           | `Debug: <issue description>`      | `Debug: Token refresh failing`      |
| Planning            | `Plan: <what was planned>`        | `Plan: Phase 2 milestone breakdown` |
| Testing             | `Test: <what was tested>`         | `Test: Auth integration tests`      |
| Documentation       | `Document: <what was documented>` | `Document: API endpoint reference`  |

---

## Multiple Agents on One Task

When parallel agents work on the same task (via `flowstate-dispatching-parallel-agents`):

- **Each agent starts its OWN timer** with its OWN `userId` (teamMemberId)
- **Each agent stops its OWN timer** when its portion completes
- The `taskId` is the same across all entries — this is how total effort is aggregated
- Multiple active timers on the same `taskId` with different `userId` values is EXPECTED

---

## Querying Time Data

### Active timers for an agent

```javascript
mcp__epic-flowstate__collection-query({
  collection: "timeentries",
  orgId: "<orgId>",
  selector: {
    userId: "<teamMemberId>",
    endAt: { $exists: false }
  }
})
```

### All time entries for a task

```javascript
mcp__epic-flowstate__collection-query({
  collection: "timeentries",
  orgId: "<orgId>",
  selector: {
    taskId: "<taskId>"
  }
})
```

### Total time for a task

Query all entries for the taskId, then sum `duration` values.

---

## Red Flags — STOP

- Starting work on a task without creating a time entry first
- Completing a task without stopping the time entry
- Creating a time entry without `userId` (agent attribution missing)
- Creating a time entry without `taskId` (not linked to work)
- Multiple active timers for the SAME agent on DIFFERENT tasks (one agent, one active timer)
- Forgetting to record the time entry ID after creation (can't stop what you can't find)
- Duration of 0 seconds (timer started and stopped instantly — no real work tracked)

---

## Rationalization Prevention

| Excuse                            | Reality                                                              |
| --------------------------------- | -------------------------------------------------------------------- |
| "This task is too small to track" | All tasks are tracked. No exceptions.                                |
| "I'll add the time entry after"   | Start BEFORE work. Timestamps must be accurate.                      |
| "The subagent will handle it"     | The dispatching agent ensures time tracking. Subagents may not know. |
| "It's just a quick fix"           | Quick fixes are tracked too. Start timer, fix, stop timer.           |
| "I forgot to start the timer"     | Create a manual entry with estimated startAt. Never skip tracking.   |

---

## FlowState Integration

Time tracking integrates with the task execution lifecycle:

| Lifecycle Point                                         | Time Tracking Action                   |
| ------------------------------------------------------- | -------------------------------------- |
| `flowstate-task-execution` Step 0 (Set In Progress)     | **Start timer**                        |
| `flowstate-task-execution` Step 3 (Execute Development) | Timer running during implementation    |
| `flowstate-task-execution` Step 6 (Code Review)         | Reviewer starts/stops their own timer  |
| `flowstate-task-execution` Step 9 (Complete)            | **Stop timer** before marking complete |
| `flowstate-subagent-development` per-task               | Each implementer starts/stops timer    |
| `flowstate-dispatching-parallel-agents` per-domain      | Each parallel agent starts/stops timer |
| `flowstate-systematic-debugging` investigation          | Timer tracks debugging effort          |

### Integration with flowstate-agent-identity

Time tracking REQUIRES agent identity:

1. Load agent definition (`flowstate-agent-identity`)
2. Extract `teamMemberId`
3. Use as `userId` on all time entries

Without identity, time entries cannot be attributed — and unattributed time entries are useless.

---

## Conventions

| Item                       | Convention                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Start before work          | Timer created BEFORE any task work begins                                                  |
| Stop after work            | Timer updated AFTER work verified complete                                                 |
| One active timer per agent | An agent should not have multiple active timers                                            |
| userId = teamMemberId      | Always from agent definition, never placeholder                                            |
| taskId links to entity     | Any entity ID (task, milestone, project)                                                   |
| Duration in seconds        | Calculated from startAt to endAt                                                           |
| Name describes work        | Use format: `{Type}: {Description}`                                                        |
| Cross-reference            | `flowstate-agent-identity` for userId resolution                                           |
| Cross-reference            | `flowstate-task-execution` for lifecycle integration points                                |
| Cross-reference            | `flowstate-verification-before-completion` for ensuring timer stopped before claiming done |

---

_Created: 2026-03-30_
