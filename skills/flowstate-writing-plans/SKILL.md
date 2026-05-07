---
name: flowstate-writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code - creates comprehensive implementation plans with bite-sized tasks, exact file paths, and complete code examples
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the flowstate-writing-plans skill to create the implementation plan."

**Context:** This should be run in a dedicated worktree (created by task execution Step 2).

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**

- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

If the plan is part of a FlowState task execution, also include:

```markdown
**FlowState Task:** `<task_id>`
**FlowState Milestone:** `<milestone_id>`
**FlowState Project:** `<project_id>`
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**

- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature

Built with Epic Flowstate"
```
````

## File Citation Requirement

**Every task in the plan MUST cite at least one existing file** that will be created or modified. This prevents plans from referencing imaginary paths or making assumptions about codebase structure.

- For each task, verify the file path exists (or its parent directory exists for new files) by reading the codebase
- If a task cannot cite an existing file, provide explicit justification: "New directory — no existing file to cite because [reason]"
- Plans that skip file verification are likely to fail during execution

## Remember

- Exact file paths always (verified against the real codebase)
- Complete code in plan (not "add validation")
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

## Self-Review Before Saving

Before saving the plan, review it:

- **Placeholder scan:** No TBDs, TODOs, or incomplete sections
- **Internal consistency:** File paths match, imports resolve, types align
- **Scope check:** Each task is 2-5 minutes, not 30-minute blocks
- **Ambiguity check:** No requirements that could be interpreted two ways
- Fix any issues inline

## After Saving

After saving the plan to `docs/plans/<filename>.md`, proceed to the next step in the calling flowstate process (e.g., flowstate-task-execution Step 2: Create Worktree).

If this plan was not invoked from a flowstate process, report:

**"Plan complete and saved to `docs/plans/<filename>.md`. Ready for execution via `flowstate-subagent-development`."**

## Deep Analysis Context

When writing implementation plans for tasks in a project that has deep-analysis outputs:

1. Check `.flowstate/analysis/outputs/` for relevant synthesis documents
2. Reference synthesis findings when citing:
   - Existing infrastructure and capabilities
   - Known technical constraints or risks
   - Cross-provider consensus on architectural decisions
3. Include a `## Context Sources` section in the plan listing which analysis outputs informed the plan

---

## Integration

**Called by:**

- **flowstate-task-execution** (Step 1) - Creates the plan for task development
- **flowstate-multi-phase-planning** (Step 5) - Creates phase plan documents

**Produces input for:**

- **flowstate-subagent-development** - Executes the plan task by task
- **flowstate-code-review** - Reviews implementation against the plan
