---
name: flowstate-dispatching-parallel-agents
description: Use when facing 2+ independent tasks or investigation domains that can be worked on without shared state or sequential dependencies - dispatches isolated subagents per domain with focused context
---

# Dispatching Parallel Agents

**Status:** Active
**Purpose:** Parallelize independent work across isolated subagents — one agent per problem domain
**Scope:** Multiple independent tasks, investigation domains, or bug hunts that don't share state
**Trigger:** 2+ independent problems identified that can run concurrently
**Input:** List of independent tasks or domains
**Output:** Parallel results integrated and verified

---

## Overview

```
Identify Domains → Create Focused Tasks → Dispatch in Parallel → Review & Integrate
       (1)                (2)                     (3)                   (4)
```

**Core principle:** One agent per independent problem domain. Agents work concurrently with isolated context — they never inherit your session history.

---

## When to Use

```
2+ independent tasks? ──YES──→ Tasks share state? ──NO──→ Use this skill
        │                              │
        NO                            YES
        ↓                              ↓
  Do sequentially              Do sequentially
```

**Use when:**

- Multiple test failures across different files/subsystems
- Independent features that don't share code
- Investigation tasks across separate components
- Bug fixes in unrelated areas

**Don't use when:**

- Tasks share state or depend on each other's output
- Changes to the same file from multiple agents (merge conflicts)
- Sequential workflow where step N depends on step N-1

---

## Step 1: Identify Independent Domains

**Who:** Assigned agent
**Pause:** No

### Actions

1. Group problems by what's broken (separate files, subsystems, features)
2. Verify independence — would fixing one affect the other?
3. If domains overlap, merge them into one agent task

### Done when

- Each domain is genuinely independent
- No shared files between domains

---

## Step 2: Create Focused Agent Tasks

**Who:** Assigned agent
**Pause:** No

### Actions

For each domain, construct a focused prompt with:

| Element           | Description                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| **Scope**         | One file, one subsystem, one feature — never multiple unrelated areas                                |
| **Context**       | Self-contained: relevant code snippets, error messages, file paths. Don't reference session history. |
| **Goal**          | Specific and measurable: "Fix the test in X by investigating Y"                                      |
| **Constraints**   | What NOT to touch, boundaries to respect                                                             |
| **Output format** | What to report back: files changed, tests run, status                                                |

### Agent Prompt Template

```
## Task
[Specific, scoped task description]

## Context
[Relevant code, error messages, architecture notes — everything the agent needs]

## Constraints
- Only modify files in [scope]
- Do not change [boundaries]
- Follow TDD: failing test first

## Expected Output
- Files changed
- Tests added/modified
- Verification results
- Any concerns or blockers
```

### Done when

- Each agent task is self-contained (no references to "earlier in our conversation")
- Scope is narrow enough that agents won't conflict

---

## Step 3: Dispatch in Parallel

**Who:** Assigned agent
**Pause:** No

### Actions

1. Dispatch all agents concurrently using the Task tool
2. Each agent runs independently with its focused prompt
3. Monitor for blockers or questions

**Individual agent execution** follows `flowstate-subagent-development` patterns — TDD, self-review, commit.

### Done when

- All agents have completed or reported blockers

---

## Step 4: Review and Integrate

**Who:** Assigned agent
**Pause:** No

### Actions

1. **Read each agent's summary** — what changed, what was found
2. **Check for conflicts** — did any agents modify the same files? (shouldn't happen if Step 1 was correct)
3. **Run full test suite** — verify all changes work together
4. **Integrate** — merge changes, resolve any unexpected interactions

### Done when

- All agent results reviewed
- Full test suite passes
- No conflicts between parallel changes
- **Sub-skill:** `flowstate-verification-before-completion` applied

---

## Common Mistakes

| Mistake                   | Why It Fails                                                | Fix                                            |
| ------------------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| Too broad scope per agent | Agent tries to fix multiple unrelated things, gets confused | One problem domain per agent                   |
| Missing context           | Agent asks questions or guesses wrong                       | Include all relevant code/errors in the prompt |
| No constraints            | Agent modifies files outside its domain                     | Explicitly state boundaries                    |
| Vague output expectations | Can't verify agent completed correctly                      | Specify exact deliverables                     |
| Shared file mutations     | Merge conflicts                                             | Verify domain independence in Step 1           |
| Skipping full test suite  | Cross-domain interactions missed                            | Always run full suite after integration        |

---

## FlowState Integration

- When working on a FlowState milestone with independent tasks, dispatch one agent per task
- Each agent follows `flowstate-task-execution` for its assigned task
- Update FlowState task statuses after integration verification
- Create a discussion on the milestone summarizing parallel work results

---

## Conventions

| Item                  | Convention                                                                       |
| --------------------- | -------------------------------------------------------------------------------- |
| One domain per agent  | Never assign multiple unrelated areas to one agent                               |
| Isolated context      | Agents get constructed prompts, never session history                            |
| Full test suite after | Always verify all changes work together                                          |
| Conflict check        | Verify no agents modified the same files                                         |
| Cross-reference       | `flowstate-subagent-development` for per-agent execution patterns                |
| Cross-reference       | `flowstate-verification-before-completion` for post-integration verification     |
| Cross-reference       | `flowstate-systematic-debugging` for parallel investigation of multi-domain bugs |

---

_Created: 2026-03-30_
