---
name: flowstate-visual-companion
description: Use during brainstorming when the user would understand a concept better by seeing it than reading it - creates self-contained HTML documents stored as FlowState documents for visual mockups, diagrams, comparisons, and design options reviewed through the approval workflow
---

# FlowState Visual Companion

**Purpose:** Browser-based visual brainstorming companion for showing mockups, diagrams, and options as FlowState documents
**Scope:** Any brainstorming or design step where visual presentation improves understanding
**Storage:** Always via MCP document tools (S3-backed, RAG-indexed)
**Review:** Uses `flowstate-approval-workflow` for review cycles

---

## When to Use

Decide per-question, not per-session. The test: **would the user understand this better by seeing it than reading it?**

**Use visual documents** when the content itself is visual:

- **UI mockups** -- wireframes, layouts, navigation structures, component designs
- **Architecture diagrams** -- system components, data flow, relationship maps
- **Side-by-side visual comparisons** -- comparing layouts, color schemes, design directions
- **Design polish** -- look and feel, spacing, visual hierarchy
- **Spatial relationships** -- state machines, flowcharts, entity relationships

**Use the terminal** when the content is text or tabular:

- **Requirements and scope questions** -- "what does X mean?", "which features are in scope?"
- **Conceptual A/B/C choices** -- picking between approaches described in words
- **Tradeoff lists** -- pros/cons, comparison tables
- **Technical decisions** -- API design, data modeling, architectural approach selection
- **Clarifying questions** -- anything where the answer is words, not a visual preference

A question _about_ a UI topic is not automatically a visual question. "What kind of wizard do you want?" is conceptual -- use the terminal. "Which of these wizard layouts feels right?" is visual -- use a visual document.

---

## How It Works

1. Claude generates self-contained HTML with inline CSS
2. HTML is stored as a FlowState document via MCP `document-create` (always S3-backed)
3. User views the rendered document in the FlowState UI (iframe sandbox)
4. User reviews through the approval workflow
5. On revision, Claude creates a new document version
6. Approved visuals become part of the project's design record

```
Claude generates HTML
    |
    v
MCP document-create (documentType: "visual", storeInS3: true)
    |
    v
FlowState document record + S3 storage + RAG indexing
    |
    v
User opens in FlowState UI --> rendered in iframe
    |
    v
Approval workflow (flowstate-approval-workflow)
    |
    +-- approved --> proceed to next step
    +-- needs-revision --> new document version --> re-review
    +-- rejected --> discard, try different approach
```

---

## Creating a Visual Document

### Step 1: Generate HTML

Write self-contained HTML with all CSS inline. No external dependencies -- the document must render standalone in an iframe.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{VISUAL_TITLE}</title>
    <style>
      /* Self-contained theme */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        padding: 2rem;
        line-height: 1.6;
      }
      h2 {
        color: #f8fafc;
        margin-bottom: 0.5rem;
        font-size: 1.5rem;
      }
      .subtitle {
        color: #94a3b8;
        margin-bottom: 2rem;
      }

      /* Options grid */
      .options {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin: 1.5rem 0;
      }
      .option {
        flex: 1;
        min-width: 250px;
        border: 2px solid #334155;
        border-radius: 12px;
        padding: 1.5rem;
        background: #1e293b;
        transition: border-color 0.2s;
      }
      .option:hover {
        border-color: #60a5fa;
      }
      .option .letter {
        display: inline-block;
        width: 2rem;
        height: 2rem;
        background: #3b82f6;
        color: white;
        border-radius: 50%;
        text-align: center;
        line-height: 2rem;
        font-weight: 700;
        margin-bottom: 0.75rem;
      }
      .option h3 {
        color: #f1f5f9;
        margin-bottom: 0.5rem;
      }
      .option p {
        color: #94a3b8;
        font-size: 0.9rem;
      }

      /* Cards */
      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin: 1.5rem 0;
      }
      .card {
        border: 2px solid #334155;
        border-radius: 12px;
        overflow: hidden;
        background: #1e293b;
      }
      .card-image {
        background: #0f172a;
        padding: 1.5rem;
        min-height: 200px;
      }
      .card-body {
        padding: 1.5rem;
      }
      .card h3 {
        color: #f1f5f9;
        margin-bottom: 0.5rem;
      }
      .card p {
        color: #94a3b8;
        font-size: 0.9rem;
      }

      /* Mockup container */
      .mockup {
        border: 2px solid #334155;
        border-radius: 12px;
        overflow: hidden;
        margin: 1.5rem 0;
      }
      .mockup-header {
        background: #1e293b;
        padding: 0.75rem 1rem;
        font-size: 0.85rem;
        color: #94a3b8;
        border-bottom: 1px solid #334155;
      }
      .mockup-body {
        padding: 1.5rem;
        background: #0f172a;
      }

      /* Split view */
      .split {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        margin: 1.5rem 0;
      }
      @media (max-width: 768px) {
        .split {
          grid-template-columns: 1fr;
        }
      }

      /* Pros/Cons */
      .pros-cons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        margin: 1rem 0;
      }
      .pros,
      .cons {
        padding: 1rem;
        border-radius: 8px;
      }
      .pros {
        background: rgba(34, 197, 94, 0.1);
        border: 1px solid rgba(34, 197, 94, 0.3);
      }
      .cons {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
      }
      .pros h4 {
        color: #22c55e;
      }
      .cons h4 {
        color: #ef4444;
      }
      .pros ul,
      .cons ul {
        padding-left: 1.5rem;
        margin-top: 0.5rem;
      }
      .pros li,
      .cons li {
        color: #cbd5e1;
        margin-bottom: 0.25rem;
      }

      /* Wireframe building blocks */
      .mock-nav {
        background: #1e293b;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #334155;
        color: #94a3b8;
        font-size: 0.85rem;
      }
      .mock-sidebar {
        width: 200px;
        background: #1e293b;
        padding: 1rem;
        border-right: 1px solid #334155;
        color: #64748b;
        min-height: 300px;
      }
      .mock-content {
        flex: 1;
        padding: 1.5rem;
        color: #94a3b8;
      }
      .mock-button {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
      }
      .mock-input {
        background: #1e293b;
        border: 1px solid #334155;
        color: #e2e8f0;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        width: 100%;
      }
      .placeholder {
        background: #1e293b;
        border: 2px dashed #334155;
        border-radius: 8px;
        padding: 2rem;
        text-align: center;
        color: #64748b;
      }

      /* Labels and sections */
      .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
        margin-bottom: 0.5rem;
      }
      .section {
        margin-bottom: 2rem;
      }
    </style>
  </head>
  <body>
    <!-- CONTENT GOES HERE -->
  </body>
</html>
```

### Step 2: Create FlowState Document

Use MCP `document-create` to store the HTML:

```
document-create:
  title: "Visual: <descriptive title>"
  documentType: "visual"
  content: <full HTML string>
  projectId: <project_id>
  milestoneId: <milestone_id>
  storeInS3: true
```

Then set `workspaceId` via `collection-update`:

```
collection-update documents <document_id> {
  "workspaceId": "<workspaceId>",
  "metadata": {
    "format": "html",
    "visualType": "<mockup|diagram|comparison|wireframe>",
    "version": 1
  }
}
```

### Step 3: Create Approval

Follow the `flowstate-approval-workflow` pattern:

```
collection-create approvals {
  projectId: "<project_id>",
  milestoneId: "<milestone_id>",
  documentId: "<visual_document_id>",
  title: "Visual review: <what is being shown>",
  type: "visual-review",
  category: "visual",
  categoryName: "Visual Review",
  status: "pending",
  documentType: "visual",
  documentContent: "<text summary of what the visual shows and what feedback is needed>",
  orgId: "<orgId>"
}
```

### Step 4: Report and Pause

```
Visual document created: <document_id>
Title: <title>
View in FlowState UI to review the visual.
Approval pending: <approval_id>
```

### Step 5: Handle Response

On resume, read the approval response per `flowstate-approval-workflow`:

- **approved** -- Visual accepted. Proceed to next step.
- **needs-revision** -- Read `comments`. Create a new visual document (version N+1) addressing the feedback. New approval.
- **rejected** -- Discard approach. Try a different visual direction.

---

## Iteration Model

Each revision creates a **new document**, not an update to the existing one. This preserves the full review history.

### Naming convention

| Version | Document Title                  |
| ------- | ------------------------------- |
| v1      | `Visual: Dashboard Layout`      |
| v2      | `Visual: Dashboard Layout (v2)` |
| v3      | `Visual: Dashboard Layout (v3)` |

### Metadata tracking

Each version's `metadata` links to the previous version:

```json
{
  "format": "html",
  "visualType": "mockup",
  "version": 2,
  "previousDocumentId": "docu_XXXXX",
  "revisionNotes": "Moved sidebar to right per reviewer feedback"
}
```

---

## CSS Class Reference

The full HTML template above provides these CSS classes:

### Options (A/B/C choices)

```html
<div class="options">
  <div class="option">
    <div class="letter">A</div>
    <h3>Option Title</h3>
    <p>Description of this option</p>
  </div>
</div>
```

### Cards (visual designs)

```html
<div class="cards">
  <div class="card">
    <div class="card-image"><!-- mockup content --></div>
    <div class="card-body">
      <h3>Design Name</h3>
      <p>Description</p>
    </div>
  </div>
</div>
```

### Mockup container

```html
<div class="mockup">
  <div class="mockup-header">Preview: Dashboard Layout</div>
  <div class="mockup-body"><!-- wireframe content --></div>
</div>
```

### Split view (side-by-side comparison)

```html
<div class="split">
  <div class="mockup"><!-- left option --></div>
  <div class="mockup"><!-- right option --></div>
</div>
```

### Pros/Cons

```html
<div class="pros-cons">
  <div class="pros">
    <h4>Pros</h4>
    <ul>
      <li>Benefit</li>
    </ul>
  </div>
  <div class="cons">
    <h4>Cons</h4>
    <ul>
      <li>Drawback</li>
    </ul>
  </div>
</div>
```

### Wireframe building blocks

```html
<div class="mock-nav">Logo | Home | About | Contact</div>
<div style="display: flex;">
  <div class="mock-sidebar">Navigation</div>
  <div class="mock-content">Main content area</div>
</div>
<button class="mock-button">Action Button</button>
<input class="mock-input" placeholder="Input field" />
<div class="placeholder">Placeholder area</div>
```

---

## Design Tips

- **Scale fidelity to the question** -- wireframes for layout decisions, polished mockups for visual style decisions
- **Explain the question on each page** -- "Which layout feels more professional?" not just "Pick one"
- **2-4 options max** per visual document
- **Use real content when it matters** -- placeholder content obscures design issues for content-heavy UIs
- **Keep mockups simple** -- focus on layout and structure, not pixel-perfect design
- **One decision per visual** -- don't combine layout choice with color choice in the same document
- **Self-contained HTML only** -- no external CSS, fonts, or images (except data URIs for small icons)

---

## Visual Types

| Type         | Use For                                         | Fidelity   |
| ------------ | ----------------------------------------------- | ---------- |
| `mockup`     | Page layouts, component designs, UI flows       | Low-Medium |
| `wireframe`  | Structure and navigation, information hierarchy | Low        |
| `diagram`    | Architecture, data flow, entity relationships   | Medium     |
| `comparison` | Side-by-side layout/style options               | Medium     |

---

## Approval Types

| Type            | Category | When Used                     |
| --------------- | -------- | ----------------------------- |
| `visual-review` | `visual` | Reviewing any visual document |

---

## Integration with Brainstorming

During `flowstate-brainstorming`, invoke this skill when a step involves visual content:

- **Step 3 (Approach Proposals):** If approaches have visual implications, create visual comparison documents
- **Step 4 (Design Sections):** Use visual documents for UI-related design sections instead of text-only discussions
- **Any step:** When the reviewer's feedback suggests "show me what you mean," switch to a visual document

The visual document's approval integrates with the brainstorming approval flow -- an approved visual becomes part of the design record.

---

## Example: Layout Comparison

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Visual: Dashboard Layout Options</title>
    <style>
      /* ... full theme CSS from template above ... */
    </style>
  </head>
  <body>
    <h2>Which dashboard layout works better?</h2>
    <p class="subtitle">Consider how users will scan and navigate the main workspace</p>

    <div class="split">
      <div class="mockup">
        <div class="mockup-header">Option A: Sidebar Navigation</div>
        <div class="mockup-body">
          <div style="display: flex; min-height: 400px;">
            <div class="mock-sidebar">
              <div class="label">Navigation</div>
              <p>Dashboard</p>
              <p>Projects</p>
              <p>Tasks</p>
              <p>Settings</p>
            </div>
            <div class="mock-content">
              <div class="label">Main Content Area</div>
              <div class="placeholder">Dashboard widgets and content</div>
            </div>
          </div>
        </div>
      </div>

      <div class="mockup">
        <div class="mockup-header">Option B: Top Navigation</div>
        <div class="mockup-body">
          <div class="mock-nav">Dashboard | Projects | Tasks | Settings</div>
          <div style="padding: 1.5rem; min-height: 370px;">
            <div class="label">Full-Width Content</div>
            <div class="placeholder">Dashboard widgets spanning full width</div>
          </div>
        </div>
      </div>
    </div>

    <div class="pros-cons">
      <div class="pros">
        <h4>Sidebar (A)</h4>
        <ul>
          <li>Always-visible navigation</li>
          <li>Scales to many nav items</li>
          <li>Standard enterprise pattern</li>
        </ul>
      </div>
      <div class="cons">
        <h4>Top Nav (B)</h4>
        <ul>
          <li>More horizontal content space</li>
          <li>Simpler for few nav items</li>
          <li>Mobile-friendly collapse</li>
        </ul>
      </div>
    </div>
  </body>
</html>
```

---

_Created: 2026-03-29_
