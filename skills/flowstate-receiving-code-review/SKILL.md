---
name: flowstate-receiving-code-review
description: Use when receiving code review feedback from a dispatched reviewer or human, before implementing suggestions - requires technical verification and evaluation, not performative agreement or blind implementation
---

# Receiving Code Review

**Status:** Active
**Purpose:** Evaluate code review feedback with technical rigor — verify before implementing, push back if wrong
**Scope:** Any code review feedback received from subagent reviewers, human reviewers, or PR comments
**Trigger:** Code review feedback arrives (from `flowstate-code-review` dispatch or human reviewer)
**Input:** Code review feedback (issues, suggestions, comments)
**Output:** Verified fixes implemented, or reasoned pushback on incorrect suggestions

---

## Core Principle

**Verify before implementing. Ask before assuming. Technical correctness over social comfort.**

---

## Response Pattern

For each piece of feedback:

1. **READ** — Complete feedback without reacting
2. **UNDERSTAND** — Restate the requirement in your own words (or ask if unclear)
3. **VERIFY** — Check the suggestion against actual codebase state
4. **EVALUATE** — Is this technically sound for THIS codebase?
5. **RESPOND** — Technical acknowledgment or reasoned pushback
6. **IMPLEMENT** — One item at a time, test each fix

**If ANY item is unclear:** STOP. Do not implement anything yet. Clarify first.

---

## Forbidden Responses

| Response                           | Why It's Wrong                                        |
| ---------------------------------- | ----------------------------------------------------- |
| "You're absolutely right!"         | Performative — signals agreement without verification |
| "Great point!"                     | Social, not technical                                 |
| "Thanks for catching that!"        | Gratitude before verification                         |
| Long apology for the mistake       | Wastes time, doesn't fix anything                     |
| Over-explaining why you were wrong | Defensive, not productive                             |

## Correct Responses

| Response                                                            | Why It Works                     |
| ------------------------------------------------------------------- | -------------------------------- |
| "Fixed. [Brief description]"                                        | Action, not performance          |
| "Good catch — [specific issue]. Fixed in [location]"                | Acknowledges + shows where fixed |
| Just show the code fix                                              | Actions speak louder             |
| "Verified: you're correct. [Reason]. Fixing."                       | Evidence-based agreement         |
| "Checked this — current implementation is correct because [reason]" | Reasoned pushback                |

---

## Evaluation by Source

### From Human Reviewer

- Trusted — implement after understanding
- Still ask if scope is unclear
- No performative agreement

### From Subagent Reviewer

- Suggestions to evaluate, not orders to follow
- Check each suggestion against codebase reality
- Subagents lack full context — verify their assumptions

### Evaluation Checklist (Per Suggestion)

1. Technically correct for THIS codebase and stack?
2. Would it break existing functionality?
3. Is there a reason for the current implementation that the reviewer missed?
4. Works across all environments (dev, Docker, production)?
5. Does the reviewer understand the full context?

---

## When to Push Back

Push back with technical reasoning when the suggestion:

- **Breaks existing functionality** — reviewer didn't account for a dependency
- **Reviewer lacks full context** — suggestion ignores architectural decisions
- **Violates YAGNI** — adds unused features ("add error handling for X" when X can't happen)
- **Technically incorrect** for the stack or framework version
- **Legacy/compatibility reasons** exist that the reviewer doesn't know about
- **Conflicts with steering docs** — suggestion contradicts QUALITY.md, SECURITY.md, etc.

**Format for pushback:**

```
Current implementation uses [X] because [reason].
The suggestion to change to [Y] would [break Z / miss edge case / violate constraint].
Keeping current approach.
```

---

## Implementation Order (Multi-Item Feedback)

1. **Clarify** anything unclear FIRST (before touching code)
2. **Critical issues** — blocking correctness problems
3. **Simple fixes** — typos, naming, formatting
4. **Complex fixes** — refactoring, architectural changes
5. **Test each fix individually** — don't batch fixes without verification
6. **Verify no regressions** — full test suite after all fixes

---

## YAGNI Gate

Before implementing any suggestion that adds new code (error handling, validation, features):

1. Grep the codebase — is this code path actually exercised?
2. Check the callers — would the failure case actually happen?
3. If the answer is "maybe someday" — don't implement it

---

## FlowState Integration

- Code review feedback during `flowstate-task-execution` Step 6 arrives via `flowstate-code-review` dispatch
- Post review responses as FlowState discussions on the task for audit trail
- If review feedback requires additional work, create follow-up sub-tasks
- Apply `flowstate-verification-before-completion` after implementing fixes

---

## Error Handling

| Situation                              | Action                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Feedback is unclear                    | Ask for clarification before implementing anything                         |
| Feedback conflicts with steering docs  | Note the conflict, follow steering docs, explain why                       |
| Feedback requires architectural change | Escalate to user — don't make large changes based on review alone          |
| Multiple reviewers disagree            | Present both perspectives to user for decision                             |
| Can't verify suggestion                | "I can't verify this without [X]. Should I [investigate / ask / proceed]?" |

---

## Conventions

| Item                      | Convention                                                                    |
| ------------------------- | ----------------------------------------------------------------------------- |
| Verify before implement   | Every suggestion checked against codebase reality                             |
| No performative agreement | Technical acknowledgment only                                                 |
| Push back when wrong      | With technical reasoning, not defensiveness                                   |
| One fix at a time         | Test each individually before moving to next                                  |
| YAGNI gate                | Grep before adding new code paths                                             |
| Cross-reference           | `flowstate-code-review` for requesting reviews (this skill handles receiving) |
| Cross-reference           | `flowstate-verification-before-completion` for verifying fixes                |
| Cross-reference           | `flowstate-test-driven-development` for writing tests for complex fixes       |

---

_Created: 2026-03-30_
