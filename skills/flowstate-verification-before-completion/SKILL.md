---
name: flowstate-verification-before-completion
description: Use when about to claim work is complete, mark a FlowState task or milestone done, or create a PR - requires running verification commands and confirming output before making any success claims
---

# Verification Before Completion

**Status:** Active
**Purpose:** No completion claims without fresh verification evidence — evidence before assertions, always
**Scope:** All completion checkpoints: task completion, milestone completion, PR creation, branch merge
**Trigger:** About to claim work is done, fixed, or passing
**Input:** Work that appears complete
**Output:** Verified completion with evidence, or honest status with actual results

---

## Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this response, you cannot claim it passes.

---

## Gate Function

Before claiming ANY status or expressing satisfaction:

1. **IDENTIFY** — What command proves this claim?
2. **RUN** — Execute the FULL command (fresh, complete, not cached)
3. **READ** — Full output, check exit code, count failures
4. **VERIFY** — Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. **ONLY THEN** — Make the claim

Skip any step = unverified claim.

---

## Common Failures

| Claim                   | Requires                                      | Not Sufficient                       |
| ----------------------- | --------------------------------------------- | ------------------------------------ |
| "Tests pass"            | Test command output: 0 failures               | Previous run, "should pass"          |
| "Linter clean"          | Linter output: 0 errors                       | Partial check, extrapolation         |
| "Build succeeds"        | Build command: exit 0                         | "Linter passed" (linter != build)    |
| "Bug fixed"             | Reproduction test: passes                     | "Code changed, assumed fixed"        |
| "Regression test works" | RED-GREEN cycle verified                      | Test passes once (never saw it fail) |
| "Subagent completed"    | VCS diff shows correct changes                | Subagent reports "success"           |
| "Requirements met"      | Line-by-line checklist verified               | "Tests pass" (tests != requirements) |
| "Task complete"         | All sub-tasks done + tests pass + no warnings | "Main feature works"                 |
| "Milestone complete"    | All tasks verified + code review done         | "All tasks marked complete"          |

---

## Red Flags — STOP Immediately

You're about to make an unverified claim if you catch yourself:

- Using "should", "probably", "seems to", "likely"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!")
- About to commit, push, or create a PR without running tests
- Trusting a subagent's success report without checking the diff
- Relying on partial verification ("linter passed, so build should too")
- Thinking "just this once" or "I'm confident"
- **Any wording implying success without having run the verification command**

---

## Rationalization Prevention

| Excuse                                        | Reality                                                  |
| --------------------------------------------- | -------------------------------------------------------- |
| "Should work now"                             | RUN the verification command                             |
| "I'm confident"                               | Confidence is not evidence                               |
| "Just this once"                              | No exceptions                                            |
| "Linter passed"                               | Linter is not the compiler                               |
| "Subagent said success"                       | Verify independently                                     |
| "Partial check is enough"                     | Partial proves nothing about the whole                   |
| "Different wording so the rule doesn't apply" | Spirit over letter — any success claim requires evidence |
| "I already ran it earlier"                    | Earlier is not now. Run it fresh.                        |

---

## Verification Patterns

### Tests

```
  RUN:    yarn test (or npm test, pytest, cargo test, etc.)
  READ:   "34/34 passing, 0 failures"
  CLAIM:  "All 34 tests pass" ← evidence attached
```

### Regression Tests (TDD Red-Green)

```
  WRITE test → RUN (passes) → REVERT fix → RUN (MUST FAIL) → RESTORE fix → RUN (passes)
  CLAIM: "Regression test verified: fails without fix, passes with fix"
```

Never claim "I've written a regression test" without the red-green verification.

### Build

```
  RUN:    yarn build (or equivalent)
  READ:   Exit code 0, no errors
  CLAIM:  "Build passes" ← evidence attached
```

### Requirements

```
  READ plan → Create checklist → Verify each item → Report gaps or completion
  CLAIM: "All 7 requirements verified" ← checklist attached
```

### Subagent Delegation

```
  Subagent reports success → Check VCS diff → Verify changes are correct → Run tests
  CLAIM: "Subagent changes verified: diff shows correct implementation, tests pass"
```

---

## FlowState Integration

This skill applies at every FlowState completion checkpoint:

| Checkpoint                                   | Verification Required                                        |
| -------------------------------------------- | ------------------------------------------------------------ |
| `flowstate-task-execution` Step 9 (Complete) | All sub-tasks done, tests pass, no warnings                  |
| `flowstate-completing-milestone` Step 1      | All tasks verified complete, no open followups               |
| `flowstate-finishing-branch` Step 1          | Full test suite passes before presenting options             |
| `flowstate-subagent-development` per-task    | Verify subagent changes independently (don't trust report)   |
| `flowstate-code-review` dispatch             | Verify code compiles and tests pass before requesting review |

**Before updating any FlowState entity status to "Complete":** run the gate function above.

---

## Conventions

| Item                | Convention                                                           |
| ------------------- | -------------------------------------------------------------------- |
| Evidence required   | Every completion claim includes the verification output              |
| Fresh runs only     | Never rely on cached or earlier test runs                            |
| Full suite required | Partial test runs don't verify completion                            |
| Gate function       | IDENTIFY → RUN → READ → VERIFY → CLAIM                               |
| Cross-reference     | `flowstate-task-execution` for task completion checkpoints           |
| Cross-reference     | `flowstate-completing-milestone` for milestone completion            |
| Cross-reference     | `flowstate-test-driven-development` for regression test verification |
| Cross-reference     | `flowstate-finishing-branch` for branch integration verification     |

---

_Created: 2026-03-30_
