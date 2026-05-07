---
name: flowstate-systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior during FlowState task execution - enforces 4-phase root cause investigation before proposing fixes, with evidence-based diagnosis and hypothesis testing
---

# Systematic Debugging

**Status:** Active
**Purpose:** Find root cause before attempting fixes — symptom fixes are failure
**Scope:** Any bug, test failure, or unexpected behavior during development
**Trigger:** Error encountered, test failure, or unexpected behavior
**Input:** Error message, failing test, or observed symptom
**Output:** Root cause identified, minimal fix applied, regression test written

---

## Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

---

## Overview

```
Phase 1: Root Cause Investigation → Phase 2: Pattern Analysis → Phase 3: Hypothesis Testing → Phase 4: Implementation
```

All four phases are mandatory. Each must complete before the next begins.

---

## Phase 1: Root Cause Investigation

**Who:** Assigned agent
**Pause:** No

### Actions

1. **Read error messages carefully**
   - Don't skip or skim — read stack traces completely
   - Note line numbers, file paths, error codes
   - Error messages often contain the exact solution

2. **Reproduce consistently**
   - Can you trigger it reliably? Exact steps? Every time?
   - If not reproducible: gather more data, don't guess

3. **Check recent changes**
   - `git diff`, recent commits, new dependencies, config changes
   - What changed that could cause this?

4. **Gather evidence in multi-component systems**
   - For EACH component boundary: log what enters, log what exits
   - Verify environment/config propagation at each layer
   - Run once to gather evidence showing WHERE it breaks
   - THEN analyze evidence to identify the failing component

5. **Trace data flow**
   - Where does the bad value originate?
   - What called this with the bad value?
   - Keep tracing upstream until you find the source
   - Fix at source, not at symptom

### Done when

- Root cause identified with evidence
- Can explain WHY the bug occurs, not just WHERE

---

## Phase 2: Pattern Analysis

**Who:** Assigned agent
**Pause:** No

### Actions

1. **Find working examples** — locate similar working code in the same codebase
2. **Compare against references** — if implementing a pattern, read the reference completely (don't skim)
3. **Identify differences** — list every difference between working and broken, however small
4. **Understand dependencies** — what components, settings, config, or assumptions does this require?

### Done when

- Working example identified (if one exists)
- All differences between working and broken code listed

---

## Phase 3: Hypothesis and Testing

**Who:** Assigned agent
**Pause:** No

### Actions

1. **Form single hypothesis** — state clearly: "I think X is the root cause because Y"
2. **Test minimally** — make the SMALLEST possible change to test the hypothesis; one variable at a time
3. **Verify before continuing:**
   - Hypothesis confirmed? Proceed to Phase 4
   - Hypothesis rejected? Form NEW hypothesis — do NOT add more fixes on top
4. **When you don't know** — say "I don't understand X." Don't pretend to know.

### Done when

- Single hypothesis confirmed with evidence
- OR: multiple hypotheses tested, root cause narrowed down

---

## Phase 4: Implementation

**Who:** Assigned agent
**Pause:** No

### Actions

1. **Create failing test case** — simplest possible reproduction as an automated test
   - **Sub-skill:** Follow `flowstate-test-driven-development` RED phase
   - MUST have a failing test before fixing

2. **Implement single fix** — address the root cause identified; ONE change at a time; no "while I'm here" improvements

3. **Verify fix:**
   - Test passes now?
   - No other tests broken?
   - Issue actually resolved?

4. **If fix doesn't work:**
   - Count: how many fixes tried?
   - If < 3: return to Phase 1, re-analyze
   - **If >= 3: STOP and question architecture** (see below)

5. **If 3+ fixes failed: Question architecture**
   - Each fix reveals a new problem in a different place
   - Fixes require "massive refactoring"
   - Each fix creates new symptoms elsewhere
   - **STOP and question fundamentals** — is this pattern sound? Should we refactor rather than continue patching?
   - Discuss with the user before attempting more fixes

### Done when

- Failing test created and passes after fix
- No regressions introduced
- **Sub-skill:** Follow `flowstate-verification-before-completion` before claiming fixed

---

## Red Flags — STOP and Follow Process

| Thought                                         | Reality                                |
| ----------------------------------------------- | -------------------------------------- |
| "Quick fix for now, investigate later"          | Investigation IS the fix               |
| "Just try changing X and see if it works"       | That's guessing, not debugging         |
| "Add multiple changes, run tests"               | One variable at a time                 |
| "Skip the test, I'll manually verify"           | Manual verification is not evidence    |
| "It's probably X, let me fix that"              | Probably != evidence                   |
| "I don't fully understand but this might work"  | Understanding is required              |
| "Here are the main problems: [list of fixes]"   | Fixes without investigation = guessing |
| "One more fix attempt" (already tried 2+)       | 3 strikes → question architecture      |
| Each fix reveals new problem in different place | Wrong architecture, not wrong fix      |

---

## Multi-Component Diagnostic Pattern

When debugging across service boundaries (MCP server, Docker containers, Kong gateway, auth server):

1. **Instrument each boundary** — add logging at entry/exit of each component
2. **Run once** — gather complete evidence of data flow
3. **Analyze evidence** — find where data transforms incorrectly
4. **Fix at source** — don't add workarounds at consumers

```
Request → Kong → Auth → MCP Server → RxDB → Response
         ↑       ↑       ↑            ↑
      Log here  Log here  Log here  Log here
```

---

## Defense-in-Depth (After Root Cause Found)

After finding and fixing the root cause, add validation at multiple layers to prevent recurrence:

| Layer          | Purpose              | Example                                    |
| -------------- | -------------------- | ------------------------------------------ |
| Entry point    | Validate input       | Zod schema at API boundary                 |
| Business logic | Assert invariants    | Type guards, runtime checks                |
| Environment    | Guard configuration  | Required env var checks at startup         |
| Debug logging  | Future investigation | Structured logging at component boundaries |

---

## FlowState Integration

- If debugging during `flowstate-task-execution`, update sub-task status to reflect investigation progress
- Create a FlowState discussion on the task with root cause findings for audit trail
- If the bug reveals a missing test, add it to the task's sub-tasks

---

## Error Handling

| Situation                     | Action                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| Cannot reproduce              | Gather more evidence (logs, state dumps), don't guess                                  |
| Root cause is environmental   | Document investigation, implement appropriate handling (retry, timeout, error message) |
| Root cause is in a dependency | Document, open issue upstream, implement workaround with clear comment                 |
| 3+ failed fix attempts        | STOP. Discuss architecture with user before proceeding                                 |

---

## Conventions

| Item                       | Convention                                                      |
| -------------------------- | --------------------------------------------------------------- |
| Investigation before fixes | Mandatory — Phase 1 must complete before Phase 4                |
| One change at a time       | Never bundle multiple fixes                                     |
| Failing test required      | Before implementing fix (Phase 4 Step 1)                        |
| Architecture escalation    | After 3 failed fix attempts                                     |
| Evidence format            | Concrete: file paths, line numbers, log output, stack traces    |
| Cross-reference            | `flowstate-test-driven-development` for Phase 4 test creation   |
| Cross-reference            | `flowstate-verification-before-completion` for fix verification |

---

_Created: 2026-03-30_
