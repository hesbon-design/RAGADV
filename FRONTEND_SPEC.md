# Frontend Specification & UI/UX Architecture: RAGADV
## Design System, Page Layouts, Component Composition & Behavioral Ergonomics
**Document Version:** 1.0.0  
**Target Stack:** Next.js 15+ (App Router), Tailwind CSS 4, shadcn/ui, AI Elements (`@ai-elements/*`), React 19  
**Design Paradigm:** Single-Operator Command Center, Split-Screen Evidence Inspector, Conversational Knowledge Archive  

---

## 1. Design System & Ergonomic Foundations

### 1.1 Visual Palette & Theming (Standard shadcn/ui Default)
RAGADV uses the standard out-of-the-box **shadcn/ui default system** (default neutral/zinc theme with standard CSS variables), avoiding custom color overrides or non-standard token names.

#### Typography
- **Primary Body & Display Font:** `Geist Sans` (`var(--font-geist-sans)` via `next/font/google`).
- **Code, Evidence Snippets & Hash IDs:** `Geist Mono` (`var(--font-geist-mono)`).
- **Hierarchy:** Standard shadcn typography scale (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `tracking-tight`).

#### Standard shadcn/ui Theme Tokens (Tailwind CSS 4 `globals.css`)
```css
@import "tailwindcss";
@plugin "tailwindcss-animate";

@custom-variant dark (&:is(.dark *));

:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 3.9%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(0 0% 3.9%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(0 0% 3.9%);
  --primary: hsl(0 0% 9%);
  --primary-foreground: hsl(0 0% 98%);
  --secondary: hsl(0 0% 96.1%);
  --secondary-foreground: hsl(0 0% 9%);
  --muted: hsl(0 0% 96.1%);
  --muted-foreground: hsl(0 0% 45.1%);
  --accent: hsl(0 0% 96.1%);
  --accent-foreground: hsl(0 0% 9%);
  --destructive: hsl(0 84.2% 60.2%);
  --destructive-foreground: hsl(0 0% 98%);
  --border: hsl(0 0% 89.8%);
  --input: hsl(0 0% 89.8%);
  --ring: hsl(0 0% 3.9%);
  --radius: 0.5rem;
}

.dark {
  --background: hsl(0 0% 3.9%);
  --foreground: hsl(0 0% 98%);
  --card: hsl(0 0% 3.9%);
  --card-foreground: hsl(0 0% 98%);
  --popover: hsl(0 0% 3.9%);
  --popover-foreground: hsl(0 0% 98%);
  --primary: hsl(0 0% 98%);
  --primary-foreground: hsl(0 0% 9%);
  --secondary: hsl(0 0% 14.9%);
  --secondary-foreground: hsl(0 0% 98%);
  --muted: hsl(0 0% 14.9%);
  --muted-foreground: hsl(0 0% 63.9%);
  --accent: hsl(0 0% 14.9%);
  --accent-foreground: hsl(0 0% 98%);
  --destructive: hsl(0 62.8% 30.6%);
  --destructive-foreground: hsl(0 0% 98%);
  --border: hsl(0 0% 14.9%);
  --input: hsl(0 0% 14.9%);
  --ring: hsl(0 0% 83.1%);
}
```

#### Standard Status Representation
Status colors map strictly to standard Tailwind utility classes without custom root variables:
- **APPROVED:** `text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20`
- **ACTION_REQUIRED:** `text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20`
- **REJECTED:** Standard shadcn `destructive` variant (`text-destructive bg-destructive/10 border-destructive/20`)
- **PROCESSING:** Standard shadcn `secondary` with pulsing indicator

### 1.2 Layout & Rhythm Principles (UX Optimizer Applied)
1. **Deterministic Gutters:** A strict 24px horizontal padding (`px-6`) across main viewport containers, preventing layout shifts during page transitions.
2. **Whispering Dividers:** All card partitions and sidebar splits use soft 1px borders with 40-50% opacity (`border-border/40`), eliminating harsh visual cages.
3. **Touch & Click Target Defense:** Interactive pills, buttons, and switches maintain a minimum 40×40px clickable boundary, with 44×44px hit-boxes on mobile drawers.
4. **Defensive Status Badges:** Status pills feature a solid 1px border, subtle translucent background (e.g. `bg-emerald-500/10 text-emerald-400 border-emerald-500/20`), and uppercase letter-spaced metadata labels (`tracking-wider text-[11px] font-semibold`).

---

## 2. Global Shell & Navigation Architecture

The application layout wraps all authenticated views in a responsive, collapsible sidebar layout (`app/(dashboard)/layout.tsx`).

```
+----------------------------------------------------------------------------------------------------+
|  [Sidebar: 64px collapsed / 240px expanded]  |  Header: Category Selector | Token Gauge | Theme |  |
|  ------------------------------------------  +----------------------------------------------------+
|  [Logo] RAGADV                               |                                                    |
|                                              |                                                    |
|  [-] Dashboard & Intake      (/dashboard)    |                                                    |
|  [-] Scorecards Archive      (/scorecards)   |                    PAGE VIEWPORT                   |
|  [-] Rule Studio             (/rules)        |             (Max-width 1600px, 24px Gutter)        |
|  [-] Ask Archive (Q&A)       (/archive)      |                                                    |
|  [-] Categories & Tags       (/categories)   |                                                    |
|  [-] System Health           (/settings)     |                                                    |
|                                              |                                                    |
|  ------------------------------------------  |                                                    |
|  [Bottom: Master Session Status / Logout]    |                                                    |
+----------------------------------------------------------------------------------------------------+
```

### 2.1 Navigation Items
| Route | Label | Icon (Lucide) | Purpose |
| :--- | :--- | :--- | :--- |
| `/dashboard` | **Dashboard & Intake** | `LayoutDashboard` | Real-time intake dropzone, active processing queue, and triage list. |
| `/scorecards` | **Scorecards Archive** | `FileCheck2` | Filterable catalog of all evaluated reports, scores, and revisions. |
| `/rules` | **Rule Studio** | `Sliders` | Hybrid rule profile manager, threshold adjuster, and keyword tripwires. |
| `/archive` | **Ask Archive** | `BotMessageSquare` | Multi-turn conversational RAG Q&A interface citing approved documents. |
| `/settings` | **System Health** | `ShieldCheck` | Storage connectivity, token consumption, backup dumps, master password. |

### 2.2 Global Top Header Components
- **Category Filter Pill:** Dropdown button to filter the active view by organizational category (e.g., `All Departments`, `Engineering`, `Finance`, `Field Logistics`). Pre-selects default rule profile.
- **Daily Token Budget Gauge:** A compact progress bar showing daily LLM token consumption (e.g., `142,500 / 500,000 Tokens (28%)`). Warning state at 80% (amber), hard error state at 100% (rose).
- **Theme Toggle:** Sun/Moon toggle with instant local storage persistence.
- **Logout Action:** Explicit lock icon button triggering `POST /api/auth/logout`.

---

## 3. Detailed Page Specifications

---

### Page 1: Single-Operator Login (`/login`)

A distraction-free, centered authentication card that validates against the `ADMIN_PASSWORD` environment variable.

#### Wireframe & Visual Composition
```
                            +---------------------------------------+
                            |               [ RAGADV ]              |
                            |   Enterprise Document Compliance Hub  |
                            |                                       |
                            |   Master Password                     |
                            |   [ *********************** ] [eye]   |
                            |                                       |
                            |   [  Unlock Command Center  ->  ]     |
                            |                                       |
                            |   🔒 Single-Operator Session Guard    |
                            +---------------------------------------+
```

#### Key Behaviors & UX Guardrails
1. **Auto-Focus:** The password input field is automatically focused on initial page render.
2. **Tactile Error State:** On 401 Unauthorized, the card executes a CSS horizontal shake animation with red outline (`border-rose-500/50`), clearing the input and displaying `"Invalid master password"`.
3. **Form Resilience:** Enter key immediately submits `POST /api/auth/login`. Primary CTA features a loading spinner during validation (`button` disabled).
4. **Session Cookie:** On 200 OK, smoothly redirects to `/dashboard` with zero client-side route flash.

---

### Page 2: All-in-One Command Center (`/dashboard`)

The operational cockpit. The Operator spends 80% of their time on this page uploading documents, monitoring the AI evaluation pipeline, and clearing action-required reports.

#### Wireframe & Visual Composition
```
+----------------------------------------------------------------------------------------------------+
|  Category: [ Engineering Progress v ]    Status: [ All ]    Search: [ Q Search reports... ]        |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  |  UPLOAD DROPZONE (@ai-elements/attachments)                                                  |  |
|  |  📁 Drag & drop weekly reports (PDF, DOCX, TXT) or click to browse                           |  |
|  |  Auto-evaluates against: 'Weekly Engineering Standard v2' | Max file: 32MB                    |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  ACTIVE INGESTION QUEUE (@ai-elements/queue, @ai-elements/task)                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | [Progress: 2/3 complete]                                                                     |  |
|  | ⏳ Q3_Field_Inspection_North.pdf  •  Extracting text (unpdf)...           [ 85% ]             |  |
|  | ⚙️ Site_Audit_Phase4.docx          •  Evaluating rules (Gemini 3.8 Flash)... [ Running... ]    |  |
|  | ❌ Budget_Variance_2026.pdf        •  Rejected: File corrupted (< 50 chars) [ Retry ]         |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  TRIAGE & RECENT SCORECARDS                                                                        |
|  +----------------------------------------------------------------------------------------------+  |
|  | Title & File       | Category     | Date        | Score | Status     | Actions               |  |
|  |--------------------+--------------+-------------+-------+------------+-----------------------|  |
|  | Weekly_Log_WK42    | Engineering  | 10m ago     | 92    | [APPROVED] | [View] [1-Click Memo] |  |
|  | Field_Report_S02   | Field Ops    | 22m ago     | 74    | [ACTION]   | [Inspect] [Override]  |  |
|  | Vendor_Audit_Final | Finance      | 1h ago      | 58    | [REJECTED] | [Inspect] [Resubmit]  |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

#### Component Composition & Features
- **Intake Dropzone:**
  - Built with `@ai-elements/attachments`.
  - Accepts single or multi-file drops.
  - Pre-flight checks file size (max 32MB) and MIME type immediately before network dispatch.
- **Live Ingestion Queue:**
  - Built with `@ai-elements/queue` and `@ai-elements/task`.
  - Visualizes parsing, token bouncer verification, and LLM rule check progress in real-time.
  - Displays graceful retry action on parse or network failure without stalling the remaining queue.
- **Triage Scorecard Table:**
  - Columns: File Title, Assigned Category, Upload Time, Deterministic Score (0–100), Compliance Status Badge, Action Buttons.
  - Hovering over status badge displays a tooltip summary (e.g. *"2 Critical Breaches: Missing Safety Sign-off, Exceeded $50k variance"*).
  - Quick 1-click memo button copies standardized author feedback draft to clipboard.

---

### Page 3: Split-Screen Evidence Inspector (`/scorecards/[id]`)

Designed specifically for verifying AI findings against source documents without cognitive context-switching.

#### Wireframe & Visual Composition
```
+----------------------------------------------------------------------------------------------------+
|  < Back to Dashboard   |  Report: Site_Audit_Phase4.docx  |  Score: 74/100 [ ACTION REQUIRED ]     |
+----------------------------------------------------+-----------------------------------------------+
|  DOCUMENT VIEWER PANE (60% Width)                  |  INTERACTIVE SCORECARD PANE (40% Width)       |
|                                                    |                                               |
|  [ Page 1 of 14 ] [ Zoom - / + ] [ Search ]        |  EXECUTIVE SUMMARY                            |
|  +----------------------------------------------+  |  "Document missing mandatory safety protocol  |
|  | 2. FINANCIAL EXPENDITURES                     |  |  appendix. Quantitative overrun of 14.2%."    |
|  | Total project variance measured at 14.2%,     |  |                                               |
|  | exceeding the standard quarterly threshold.  |  |  MANDATORY SECTIONS CHECKLIST (Penalty: 25ea) |
|  |                                              |  |  [✓] 1. Executive Summary                     |
|  | :: [EVIDENCE HIGHLIGHT #1] ::                 |  |  [✗] 2. Safety Protocol Sign-off (MISSING)    |
|  | "Safety officer sign-off was not obtained    |  |                                               |
|  | prior to field mobilization due to time      |  |  QUANTITATIVE THRESHOLDS (Penalty: 20ea)      |
|  | constraints."                                |  |  [✗] Budget Variance <= 10.0%                 |
|  |                                              |  |      Found: 14.2% (Page 4, Paragraph 2)       |
|  | 3. FIELD OBSERVATIONS                        |  |      [ Jump to Evidence in Doc ]              |
|  | Field observations were conducted on...      |  |                                               |
|  |                                              |  |  RED-FLAG TRIPWIRES (Penalty: 15ea)           |
|  |                                              |  |  [✓] Zero unauthorized subcontractor logs     |
|  |                                              |  |                                               |
|  |                                              |  |  SUPERVISORY OVERRIDE                         |
|  |                                              |  |  Reason: [ Approved emergency variance   v ]  |
|  |                                              |  |  [ Force Approve ]   [ Reject with Memo ]     |
|  +----------------------------------------------+  +-----------------------------------------------+
+----------------------------------------------------------------------------------------------------+
```

#### Component Composition & Features
- **Left Viewer Pane (60% Desktop Split):**
  - Integrated PDF / clean text canvas with synchronized page navigation and text search.
  - Highlights specific evidence passages in light amber/yellow when selected from the right-hand panel.
- **Right Scorecard Pane (40% Desktop Split):**
  - Uses `@ai-elements/reasoning` to inspect the AI's internal reasoning chain for ambiguous rules.
  - **Click-to-Evidence Navigation:** Clicking any rule check badge instantly scrolls the left document pane directly to the offending page and highlights the cited text.
  - **Supervisory Override Controls:** Operator can toggle any individual rule from `FAIL` to `PASS` or vice-versa with a mandatory audit reason picker. The overall score recalculates in real-time on the client.
  - **1-Click Feedback Formatter:** Pre-populates an email/Slack-ready Markdown memo explaining failures, citations, and required corrective steps.

---

### Page 4: Hybrid Rule Studio (`/rules` & `/rules/[id]`)

Enables Mary/The Operator to construct deterministic compliance profiles through visual form controls without writing code.

#### Wireframe & Visual Composition
```
+----------------------------------------------------------------------------------------------------+
|  Rule Profile: [ Standard Engineering Progress Audit v2 ]              [ Set as Default ] [ Save ] |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  SECTION 1: MANDATORY DOCUMENT HEADINGS (25 pts deduction per missing section)                     |
|  +----------------------------------------------------------------------------------------------+  |
|  |  Add required heading: [ Enter section title...           ] [ + Add Section ]                |  |
|  |                                                                                              |  |
|  |  [ Executive Summary      x ]   [ Milestone Progress Matrix x ]   [ Risk Register         x ]  |  |
|  |  [ Quality Sign-off Sheet x ]   [ Financial Expenditure Log x ]                              |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  SECTION 2: QUANTITATIVE THRESHOLD GATES (20 pts deduction per metric breach)                      |
|  +----------------------------------------------------------------------------------------------+  |
|  |  + Threshold Rule Card                                                                       |  |
|  |    Metric Name: [ Budget Variance Ceiling        ]                                           |  |
|  |    Operator:    [ Less than or equal to (<=)   v ]                                           |  |
|  |    Target Value:[ 10.0                       ]  Unit: [ % ]                                  |  |
|  |    Severity:    [ CRITICAL (Triggers Rejection) v ]                                          |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  SECTION 3: RED-FLAG TRIPWIRE KEYWORDS (15 pts deduction per tripwire found)                       |
|  +----------------------------------------------------------------------------------------------+  |
|  |  Keywords & Phrases: [ "stop work order", "unapproved delay", "safety breach", "litigation" ]  |  |
|  |  Tolerance: [ 0 occurrences permitted ]                                                      |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  SECTION 4: CUSTOM NATURAL LANGUAGE CRITERIA (Configurable weights: 5–25 pts)                     |
|  +----------------------------------------------------------------------------------------------+  |
|  |  Rule: "Verify that all subcontractor personnel certifications are explicitly attached."      |  |
|  |  Deduction Weight: [ 15 pts ] | Strictness: [ Strict ]                                       |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

#### Component Composition & Features
- Tag input input chips for mandatory sections and red-flag tripwires.
- Numeric stepper and operator dropdowns (`>`, `<`, `==`, `within range`) for quantitative thresholds.
- Live test simulator: A "Test Against Report" side sheet allowing the operator to run the draft rules against an existing document to preview scoring accuracy before saving.
- Version history drawer showing previous revisions and diffs.

---

### Page 5: "Ask Archive" Conversational Intelligence (`/archive`)

A research interface querying only verified, approved reports using hybrid retrieval and knowledge reflection.

#### Wireframe & Visual Composition
```
+----------------------------------------------------------------------------------------------------+
|  Ask Archive: Natural Language Enterprise Synthesis                                                |
|  Active Scope: [ All Approved Engineering Reports (48) v ] [ Date: Last 90 Days v ]                |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  KNOWLEDGE REFLECTION SYNTHESIS PILLS (@ai-elements/shimmer)                                       |
|  +----------------------------------------------------------------------------------------------+  |
|  | 💡 Cross-Report Insight: Budget overruns across Q2/Q3 were primarily concentrated in concrete  |  |
|  | suppliers (Vendor X accounted for 64% of variances). [ View Consolidated Summary ]           |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  CHAT STREAM CONTAINER (@ai-elements/conversation, @ai-elements/message)                           |
|  +----------------------------------------------------------------------------------------------+  |
|  |                                                                                              |  |
|  | [User]: What were the recurring safety violations noted in the northern sector during August? |  |
|  |                                                                                              |  |
|  | [Assistant]:                                                                                 |  |
|  | In August 2026, two primary safety violations recurred across northern sector audits:       |  |
|  | 1. Missing scaffolding harness lockouts on Towers A & B [1].                                |  |
|  | 2. Failure to submit daily excavation depth logs prior to shift start [2][3].                |  |
|  |                                                                                              |  |
|  | SOURCES & CITATIONS (@ai-elements/sources, @ai-elements/inline-citation)                     |  |
|  | +------------------------------------------------------------------------------------------+ |  |
|  | | [1] Site_Audit_North_Aug12.pdf (Page 4, Paragraph 3) • Approved Aug 14                   | |  |
|  | | [2] Weekly_Safety_Log_WK33.docx (Page 2) • Approved Aug 21                             | |  |
|  | | [3] Northern_Excavation_Summary.pdf (Page 8) • Approved Aug 28                           | |  |
|  | +------------------------------------------------------------------------------------------+ |  |
|  |                                                                                              |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  PROMPT INPUT BAR (@ai-elements/prompt-input)                                                      |
|  [ Ask a question across approved documents, compliance trends, or supplier audits...    ] [ Send ]|
+----------------------------------------------------------------------------------------------------+
```

#### Component Composition & Features
- **AI Elements Integration:**
  - `@ai-elements/conversation`: Coordinates message history and scroll anchoring.
  - `@ai-elements/message`: Formats markdown output with code blocks, tables, and lists.
  - `@ai-elements/inline-citation`: Renders interactive `[1]`, `[2]` citation markers that trigger source previews on hover.
  - `@ai-elements/sources`: Accordion panel enumerating source documents, timestamps, and excerpt snippets.
  - `@ai-elements/prompt-input`: Auto-expanding textarea with keyboard shortcuts (`Cmd+Enter` to submit).

---

### Page 6: System Health & Categories (`/settings`)

A single-page utility dashboard keeping the single operator informed of storage, database, and infrastructure status.

#### Key Sections
1. **Infrastructure Health Indicators:**
   - **PostgreSQL & pgvector:** Connection latency, total vector embeddings stored, database size.
   - **Cloudflare R2 / MinIO:** Blob storage accessibility, total stored documents, bucket capacity.
   - **LLM Provider:** Latency probe to Google Gemini 3.8 Flash, fallback status (Groq/OpenAI compatible).
2. **Category / Department Manager:**
   - Add/edit category folders (e.g. `Engineering`, `Legal`, `Operations`).
   - Assign a default Rule Profile to each category for zero-click uploads.
3. **Database Maintenance & Backups:**
   - 1-click `Trigger pg_dump` button to push an encrypted database snapshot to the R2 backup bucket.
   - 30-day purged report retention cleaner.

---

## 4. Master Component Inventory & State Matrix

| Page Route | Primary shadcn/ui Components | Primary AI Elements (`@ai-elements/*`) | Loading State Pattern | Empty State Pattern | Error State Pattern |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/login` | `Card`, `Input`, `Button`, `Label` | — | Button spinner (`Loader2`) | Clean form | Red outline shake + toast alert |
| `/dashboard` | `Table`, `Badge`, `DropdownMenu`, `Tabs`, `Dialog` | `attachments`, `queue`, `task` | Skeleton table rows (3 pulses) | "No documents uploaded yet. Drop a PDF above to begin." | Task retry button + inline error banner |
| `/scorecards/[id]` | `ResizablePanelGroup`, `ScrollArea`, `Accordion`, `Tooltip` | `reasoning` | Split-pane skeleton wireframe | "Scorecard data not found or deleted." | "Evaluation Failed" banner with re-run CTA |
| `/rules` | `Card`, `Switch`, `Slider`, `Badge`, `Sheet`, `Input` | — | Card grid skeleton | "No rule profiles created. Click 'Create Profile' to start." | Validation warning chips under inputs |
| `/archive` | `ScrollArea`, `Accordion`, `Badge` | `conversation`, `message`, `prompt-input`, `inline-citation`, `sources`, `shimmer` | Shimmer pulse during hybrid RRF retrieval | "No approved documents match the active filter." | "Query failed" bubble with Retry button |
| `/settings` | `Card`, `Progress`, `Separator`, `Button` | — | Progress bar pulse | — | Red badge on disconnected service |

---

## 5. Responsive Behavior & Viewport Breakpoints

| Breakpoint | Layout Adaptations |
| :--- | :--- |
| **Desktop (`>= 1280px`)** | Full expanded layout. Left navigation sidebar open (240px). `/scorecards/[id]` operates in native **60/40 Split-Screen Inspector** mode. |
| **Tablet / Small Laptop (`768px – 1279px`)** | Sidebar collapses automatically into an icon-only rail (64px). `/scorecards/[id]` defaults to a stacked layout with a tabbed toggle: `[ Document Viewer ]` vs `[ Scorecard Checklist ]`. |
| **Mobile (`< 768px`)** | Sidebar transforms into a bottom sheet drawer accessible via hamburger menu. Dropzone simplifies to a single-file tap-to-upload card. Scorecards render as full-width mobile cards with collapsible rule details. |

---

## 6. Implementation Readiness & Sprint Alignment

With this frontend specification established, implementation proceeds in lockstep with the [implementation_plan.md](file:///c:/MY%20FILES/RAG/implementation_plan.md):

1. **Sprint 1:** Scaffold Next.js 15, Tailwind CSS 4, shadcn/ui base components, and the `/login` screen.
2. **Sprint 2:** Implement the `/dashboard` Dropzone using `@ai-elements/attachments` and wire up the ingestion pipeline.
3. **Sprint 3:** Build the Split-Screen Inspector (`/scorecards/[id]`) with `@ai-elements/reasoning` and the Rule Studio (`/rules`).
4. **Sprint 5–6:** Build the "Ask Archive" interface using `@ai-elements/conversation`, `@ai-elements/message`, and `@ai-elements/sources`.
