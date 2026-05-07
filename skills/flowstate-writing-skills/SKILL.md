---
name: flowstate-writing-skills
description: Use when creating new FlowState skills, editing existing skills, or verifying skills work before deployment - provides SKILL.md structure, YAML frontmatter requirements, description optimization, token efficiency, testing methodology, and the RED-GREEN-REFACTOR cycle adapted for process documentation
---

# Writing FlowState Skills

**Status:** Active
**Purpose:** Standard operating procedure for creating, testing, and deploying FlowState skills
**Scope:** All skills in `flowstate-skills/skills/`
**Trigger:** Need to document a new process, pattern, or reference as a reusable FlowState skill

---

## Overview

**Writing skills IS Test-Driven Development applied to process documentation.**

You write test cases (pressure scenarios with subagents), watch them fail (baseline behavior), write the skill (SKILL.md), watch tests pass (agents comply), and refactor (close loopholes).

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

---

## When to Create a Skill

**Create when:**

- Process wasn't intuitively obvious
- You'd reference this again across projects or sessions
- Pattern applies broadly to FlowState workflows
- Multiple agents or sessions would benefit

**Don't create for:**

- One-off solutions
- Standard practices documented in steering docs
- Project-specific conventions (put in CLAUDE.md or `.claude/rules/`)
- Mechanical constraints enforceable with validation or linting

---

## Skill Types

| Type          | Description                                                          | Examples                                                    |
| ------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Workflow**  | Multi-step process with numbered steps, pause points, approvals      | `flowstate-brainstorming`, `flowstate-task-execution`       |
| **Schema**    | Collection field reference, ID formats, MCP tools, creation commands | `flowstate-product-schema`, `flowstate-task-schema`         |
| **Pattern**   | Composable building block invoked by other skills                    | `flowstate-pre-flight-check`, `flowstate-create-if-missing` |
| **Reference** | API docs, tool documentation, lookup tables                          | `flowstate-subtask-template`                                |

---

## Directory Structure

```
flowstate-skills/skills/
  flowstate-<skill-name>/
    SKILL.md              # Main reference (required)
    supporting-file.*     # Only if needed
```

**Flat namespace** under `flowstate-skills/skills/`. All skill names prefixed with `flowstate-`.

**Separate files for:**

1. Heavy reference (100+ lines) - API docs, comprehensive syntax
2. Reusable tools - Scripts, templates

**Keep inline:** Principles, concepts, code patterns (< 50 lines), everything else.

---

## SKILL.md Structure

### YAML Frontmatter (Required)

Two required fields: `name` and `description`.

```yaml
---
name: flowstate-<skill-name>
description: Use when [specific triggering conditions and symptoms] - [what it provides]
---
```

- `name`: Prefix with `flowstate-`. Use letters, numbers, hyphens only.
- `description`: Start with "Use when..." to focus on triggering conditions. Include specific situations and contexts. Append "- [what it provides]" after a dash. Max 1024 characters total, aim for under 500.

### Body Structure

FlowState skills follow a consistent pattern based on skill type:

**Workflow skills** (multi-step processes):

```markdown
# Skill Title

**Status:** Active
**Purpose:** One-sentence purpose
**Scope:** Where this applies
**Trigger:** What starts this process
**Input:** What's needed to begin
**Output:** What's produced

---

## Overview

1-2 sentence core principle. ASCII flow diagram showing step numbers.

---

## Prerequisites

What must exist before starting.

---

## Step N: Step Name

**Who:** Agent or human
**Pause:** Yes/No (approval gate)

### Actions

1. Numbered action items with MCP tool examples
2. ...

### Done when

- Bullet list of completion criteria

---

## Error Handling

| Situation | Action |
| --------- | ------ |

---

## Conventions

| Item | Convention |
| ---- | ---------- |

---

_Created: YYYY-MM-DD_
```

**Schema skills** (field reference):

```markdown
# Collection Schema

**Status:** Active
**Collection:** `collection_name`
**ID Prefix:** `prefix_`
**Hierarchy Level:** Where it sits

---

## Overview

Hierarchy diagram showing relationships.

---

## Collections

### `collection_name` (Core Record)

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |

### `junction_collection` (Junction)

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |

---

## Enums / Types

Tables for enum values.

---

## MCP Tools

| Tool | Purpose |
| ---- | ------- |

---

## Conventions

| Item | Convention |
| ---- | ---------- |

---

_Created: YYYY-MM-DD_
```

**Pattern / Reference skills** use a simplified version with Overview, When to Use, Quick Reference, and Implementation sections.

---

## Description Optimization

The description field determines whether Claude loads your skill. Optimize it carefully.

### Description = When to Use, NOT What It Does

Describe triggering conditions only. Do NOT summarize the skill's process or workflow.

**Why this matters:** When a description summarizes workflow, Claude may follow the description instead of reading the full skill content. A description that captures the workflow creates a shortcut Claude will take, skipping the actual skill body.

```yaml
# BAD: Summarizes workflow - Claude may follow this instead of reading skill
description: Use when creating products - gathers definition, creates goals, links team members

# BAD: Too much process detail
description: Use for brainstorming - asks questions, proposes approaches, writes design doc

# GOOD: Triggering conditions only, then what it provides
description: Use when creating a FlowState product with goals, roadmap, and team associations - provides single-call creation workflow with product-type role templates

# GOOD: Symptoms and situations
description: Use when a monorepo has workspace registered but packages lack project records - scans packages, creates missing records, writes config files
```

### Content Guidelines

- Use concrete triggers, symptoms, and situations
- Describe the _problem_ not language-specific symptoms
- Write in third person (injected into system prompt)
- After the triggering conditions, add "- [what it provides]" for discoverability
- **NEVER summarize the skill's process or workflow**

### Keyword Coverage

Use words Claude would search for:

- Collection names: `products`, `teammembers`, `milestones`
- MCP tool names: `product-create`, `collection-query`
- Error symptoms: "missing orgId", "orphaned entities"
- FlowState concepts: "pre-flight check", "approval workflow"

---

## Token Efficiency

Skills in the index (`flowstate-using-flowstate-skills`) load descriptors into every conversation. The skills themselves load on demand, but still consume context.

**Techniques:**

- Use cross-references to other skills instead of repeating content
- Reference MCP tool names without documenting all parameters
- One excellent example beats many mediocre ones
- Move heavy reference to supporting files (100+ lines)
- Use tables for scanning, not paragraphs

```markdown
# BAD: Repeating content from another skill

When linking team members, load all teammembers, apply the role template...
[40 lines duplicated from flowstate-product-link-teammembers]

# GOOD: Cross-reference

**Sub-skill:** Invoke `flowstate-product-link-teammembers` for team association.
```

---

## Updating the Skills Index

After creating a skill, update `flowstate-skills/skills/flowstate-using-flowstate-skills/SKILL.md`:

1. Add the skill to the appropriate section table
2. If it's part of a composition tree, update the Skill Dependency Map
3. If it creates a new category, add a new section

---

## RED-GREEN-REFACTOR for Skills

Follow the TDD cycle adapted for process documentation:

### RED: Write Failing Test (Baseline)

Run a pressure scenario with a subagent WITHOUT the skill. Document exact behavior:

- What choices did the agent make?
- What rationalizations did it use (verbatim)?
- What steps did it skip or get wrong?

This is "watch the test fail" - see what agents naturally do before writing the skill.

### GREEN: Write Minimal Skill

Write the skill addressing the specific failures from the baseline. Don't add content for hypothetical cases.

Run same scenarios WITH the skill. Agent should now comply.

### REFACTOR: Close Loopholes

Agent found a new rationalization? Add explicit counter. Re-test until bulletproof.

---

## Testing by Skill Type

### Workflow Skills (discipline-enforcing)

**Test with:**

- Pressure scenarios: Does the agent follow steps under time pressure?
- Skip scenarios: Does it skip steps when told "just do it quickly"?
- Multiple pressures combined: time + sunk cost + user impatience

**Success:** Agent follows all steps under maximum pressure.

### Schema Skills (reference)

**Test with:**

- Retrieval: Can the agent find the right field names?
- Application: Does it use correct MCP tool calls?
- Gap testing: Are common use cases covered?

**Success:** Agent finds and correctly applies reference information.

### Pattern Skills (composable building blocks)

**Test with:**

- Recognition: Does the agent know when to invoke this sub-skill?
- Application: Can it apply the pattern correctly to a new context?
- Integration: Does it compose properly with parent skills?

**Success:** Agent correctly identifies when and how to use the pattern.

---

## Bulletproofing Against Rationalization

Skills that enforce discipline need to resist rationalization. Agents will find loopholes under pressure.

### Close Every Loophole Explicitly

Don't just state the rule - forbid specific workarounds:

```markdown
# Weak

Create sub-tasks before starting development.

# Strong

Create sub-tasks before starting development.

**No exceptions:**

- Don't skip "because the task is simple"
- Don't create them retroactively after development
- Don't combine multiple sub-tasks into one
```

### Build Rationalization Tables

Capture rationalizations from baseline testing:

```markdown
| Excuse                             | Reality                                        |
| ---------------------------------- | ---------------------------------------------- |
| "Task is too simple for sub-tasks" | Simple tasks still need tracking. Create them. |
| "I'll create them after"           | After = never. Create before starting.         |
```

### Create Red Flags Lists

Make it easy for agents to self-check:

```markdown
## Red Flags - STOP

- Skipping pre-flight check
- Using placeholder orgId/workspaceId
- Creating tasks without milestoneId
- Committing without `Built with Epic Flowstate`

**All of these mean: Stop and follow the skill.**
```

---

## Anti-Patterns

| Anti-Pattern                          | Why It's Bad                                             | Do Instead                            |
| ------------------------------------- | -------------------------------------------------------- | ------------------------------------- |
| Narrative storytelling                | "In session X, we found..." — too specific, not reusable | State the pattern directly            |
| Duplicating content from other skills | Maintenance burden, divergence risk                      | Cross-reference with skill name       |
| Generic labels in diagrams            | `step1`, `helper2` — no semantic meaning                 | Use descriptive labels                |
| Multi-language code examples          | Mediocre quality, maintenance burden                     | One excellent example                 |
| Skipping baseline testing             | Don't know what the skill actually fixes                 | Always run RED phase first            |
| Batch-creating untested skills        | Deploying untested skills = deploying untested code      | Test each skill before moving to next |

---

## Skill Creation Checklist

**RED Phase - Baseline:**

- [ ] Identify the process gap or failure mode
- [ ] Run pressure scenario WITHOUT the skill (subagent)
- [ ] Document baseline behavior and rationalizations verbatim

**GREEN Phase - Write Skill:**

- [ ] Create `flowstate-skills/skills/flowstate-<name>/SKILL.md`
- [ ] YAML frontmatter: `name` (flowstate- prefix, hyphens only) and `description` (Use when...)
- [ ] Description: triggering conditions only, no workflow summary, under 500 chars
- [ ] Body follows the correct template for skill type (workflow/schema/pattern/reference)
- [ ] Keywords throughout for search (collections, tools, symptoms)
- [ ] Addresses specific baseline failures from RED phase
- [ ] One excellent example per pattern (not multi-language)
- [ ] Run same scenario WITH skill - verify compliance

**REFACTOR Phase - Harden:**

- [ ] Identify new rationalizations from testing
- [ ] Add explicit counters (rationalization tables, red flags)
- [ ] Re-test until bulletproof

**Integration:**

- [ ] Update skills index (`flowstate-using-flowstate-skills/SKILL.md`)
- [ ] Add to correct section table
- [ ] Update Skill Dependency Map if composable
- [ ] Commit to git with: `feat(skills): add flowstate-<name> skill`

---

## Conventions

| Item              | Convention                                                          |
| ----------------- | ------------------------------------------------------------------- |
| Skill directory   | `flowstate-skills/skills/flowstate-<name>/`                         |
| Skill file        | `SKILL.md` (required)                                               |
| Name prefix       | `flowstate-` (always)                                               |
| Name format       | Lowercase, hyphens only: `flowstate-product-schema`                 |
| Description start | "Use when..."                                                       |
| Skill invocation  | `flowstate-skills:flowstate-<name>` via Skill tool                  |
| Index location    | `flowstate-skills/skills/flowstate-using-flowstate-skills/SKILL.md` |
| Cross-reference   | Use skill name only, not file paths                                 |
| Commit format     | `feat(skills): add flowstate-<name> skill`                          |
| Supporting files  | Only for 100+ line reference or reusable tools                      |

---

_Created: 2026-03-30_
