---
name: flowstate-test-driven-development
description: Use when implementing any feature or bugfix during FlowState task execution - enforces RED-GREEN-REFACTOR cycle with failing test before production code, verification at each step, and rationalization prevention
---

# Test-Driven Development

**Status:** Active
**Purpose:** Write test first, watch it fail, write minimal code to pass — enforced via verification steps
**Scope:** All implementation work during FlowState task execution
**Trigger:** About to write production code for a feature or bugfix
**Input:** Feature requirement or bug to fix
**Output:** Tested, verified code with failing-test-first evidence

---

## Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Wrote code before test? Delete it. Start over. No exceptions without explicit user permission.

**Steering reference:** [TDD.md](../../.flowstate/steering/TDD.md) for project-specific testing conventions.

---

## Overview

```
RED (failing test) → GREEN (minimal code) → REFACTOR (clean up) → repeat
```

Each step has a mandatory verification gate. Skipping verification = skipping TDD.

---

## RED: Write Failing Test

### Actions

1. Write ONE minimal test showing what should happen
2. Requirements:
   - One behavior per test ("and" in the name? Split it)
   - Clear name that describes the behavior
   - Real code — no mocks unless unavoidable
   - Test the behavior, not the implementation

### Verify RED (Mandatory)

Run the test. Confirm:

- [ ] Test **fails** (not errors — fails with expected assertion)
- [ ] Failure message is what you expect
- [ ] Fails because the feature is missing (not because of typos or setup errors)

Test passes? You're testing existing behavior — fix the test.
Test errors (not assertion failure)? Fix the error, re-run until it fails correctly.

**NEVER skip this verification.** A test you never saw fail proves nothing.

---

## GREEN: Write Minimal Code

### Actions

1. Write the SIMPLEST code that makes the test pass
2. Don't over-engineer or add features the test doesn't require
3. Don't optimize — just make it work

### Verify GREEN (Mandatory)

Run the test. Confirm:

- [ ] Test passes
- [ ] Other tests still pass (no regressions)
- [ ] Output is clean (no errors, warnings)

Test fails? Fix the code, not the test.
Other tests broke? Fix them now — don't defer regressions.

---

## REFACTOR: Clean Up

### Actions

After GREEN only — tests are passing before you touch anything:

1. Remove duplication
2. Improve names
3. Extract helpers if clarity improves

Keep tests green throughout. Don't add new behavior during refactor.

### Verify REFACTOR (Mandatory)

- [ ] All tests still pass after cleanup
- [ ] No behavior changes — only structure improvements

---

## Repeat

Next failing test for the next piece of behavior.

---

## Why Order Matters

| Rationalization                           | Reality                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| "Too simple to test"                      | Simple code breaks. Test takes 30 seconds.                                             |
| "I'll write tests after"                  | Tests written after pass immediately — proves nothing                                  |
| "Tests after achieve the same goals"      | Tests-after answer "what does it do?" Tests-first answer "what SHOULD it do?"          |
| "Already manually tested all edge cases"  | Manual testing has no record, can't re-run, misses cases under pressure                |
| "Deleting X hours of work is wasteful"    | Sunk cost fallacy. Untested code is technical debt.                                    |
| "Keep it as reference, write tests first" | You'll adapt it. That's testing after. Delete means delete.                            |
| "Need to explore first"                   | Fine. Throw away exploration. Start fresh with TDD.                                    |
| "Test is hard to write = skip it"         | Hard to test = hard to use. Listen to the test — simplify the design.                  |
| "TDD slows me down"                       | TDD is faster than debugging production. Measured, not felt.                           |
| "Existing code has no tests"              | You're improving it. Add tests for the code you're touching.                           |
| "Being pragmatic means adapting"          | TDD IS pragmatic — finds bugs before commit, prevents regressions, enables refactoring |

---

## Testing Anti-Patterns

### Testing Mock Behavior

Never test that a mock returns what you told it to return.

```typescript
// BAD — tests the mock, not the code
const mock = jest.fn().mockResolvedValue('success')
await retryOperation(mock)
expect(mock).toHaveBeenCalledTimes(3)

// GOOD — tests actual behavior
let attempts = 0
const operation = () => {
  attempts++
  if (attempts < 3) throw new Error('fail')
  return 'success'
}
const result = await retryOperation(operation)
expect(result).toBe('success')
expect(attempts).toBe(3)
```

### Incomplete Mocks

Never create partial mocks with only fields you think you need. Mock the COMPLETE data structure as it exists in reality. Partial mocks hide structural assumptions and fail silently.

### Test-Only Methods in Production

Never add methods to production classes that only exist for tests. Put cleanup and test helpers in test utilities.

### Mocking Without Understanding

Before mocking, answer:

1. What side effects does the real method have?
2. Does this test depend on any of those side effects?
3. Do I understand what the test actually needs?

If the test depends on side effects: mock at a lower level, not the high-level method.

---

## Verification Checklist

Before marking implementation complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing (RED verified)
- [ ] Each test failed for the expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test (GREEN verified)
- [ ] All tests pass
- [ ] Output is clean — no errors, no warnings
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and error paths covered

Can't check all boxes? You skipped TDD. Start over.

---

## When Stuck

| Problem                | Solution                                                           |
| ---------------------- | ------------------------------------------------------------------ |
| Don't know how to test | Write the wished-for API. Write the assertion first. Ask the user. |
| Test too complicated   | Design too complicated. Simplify the interface.                    |
| Must mock everything   | Code too coupled. Use dependency injection.                        |
| Test setup is huge     | Extract helpers. Still complex? Simplify the design.               |

---

## FlowState Integration

- TDD is the implementation method for `flowstate-task-execution` Step 3 (Development)
- TDD is the implementation method for `flowstate-subagent-development` implementer subagents
- `flowstate-systematic-debugging` Phase 4 uses TDD to create the regression test
- `flowstate-verification-before-completion` verifies test results before claiming done

---

## Conventions

| Item                  | Convention                                                                       |
| --------------------- | -------------------------------------------------------------------------------- |
| Test-first            | Mandatory for all new code — no exceptions without user permission               |
| One behavior per test | "and" in the name means split it                                                 |
| Real code over mocks  | Mocks only when unavoidable (external services, filesystem, network)             |
| Verification gates    | RED, GREEN, and REFACTOR each require running tests and reading output           |
| Delete means delete   | Code written before tests gets deleted, not "kept as reference"                  |
| Steering reference    | [TDD.md](../../.flowstate/steering/TDD.md) for project-specific testing patterns |
| Cross-reference       | `flowstate-systematic-debugging` for bug-first TDD (regression tests)            |
| Cross-reference       | `flowstate-verification-before-completion` for evidence-based completion         |

---

_Created: 2026-03-30_
