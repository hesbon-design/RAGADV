# RAGADV 🚀
## Enterprise Automated Document Review, Compliance Auditing & Self-Learning Knowledge Platform
**Document Version:** 3.4.0  
[![Version](https://img.shields.io/badge/version-3.4.0-blue?style=flat)]()
[![Next.js 15+](https://img.shields.io/badge/Next.js-15%2B-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-AI_Elements-black?style=flat)](https://ui.shadcn.com/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-ai--sdk-blue?style=flat)](https://sdk.vercel.ai/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.8_Flash-orange?style=flat&logo=google)](https://ai.google.dev/)
[![Production RAG](https://img.shields.io/badge/Architecture-Self--Learning_RAG-emerald?style=flat)]()

---

## 📖 Overview & Executive Summary

In high-volume document environments (Project Management Offices, engineering departments, consulting desks, field NGOs, and editorial desks), organizations face severe cognitive exhaustion: **reviewing dozens of repetitive, routine reports submitted weekly**.

**RAGADV** is a self-hosted, single-operator AI document compliance and audit platform modeled on the architecture of **Applicant Tracking Systems (ATS)**. Instead of screening CVs, it automatically audits incoming multi-page reports against department-defined **Rule Profiles** (mandatory sections, quantitative thresholds, and red-flag tripwires), generating structured compliance scorecards and 1-click feedback memos for authors.

Access is secured via a single environment-variable master password (`ADMIN_PASSWORD`), eliminating database user management and multi-user RBAC overhead. The operator uploads batches of reports or reviews submissions directly, which are auto-evaluated by the AI agent against department rule profiles to generate immediate scorecard results.

Once reports are verified and approved, they automatically populate a **Self-Learning Knowledge Archive** powered by **Contextual Retrieval**, **Hybrid BM25 + Vector Search (with Reciprocal Rank Fusion)**, and an **Asynchronous Knowledge Reflection Engine** that synthesizes cross-report connections over time.

---

## 🌟 Key Capabilities

### 1. Document Ingestion & Batch Management Portal
- **Direct Batch Ingestion:** Operators directly upload batches of 5 to 25 documents (PDF, DOCX, TXT) received via email, shared drives, or messaging channels into the review queue.
- **Automated Document Evaluation:** Reports are automatically evaluated by the AI agent against department-defined rule profiles upon ingestion.

### 2. No-Code Hybrid Rule Builder
Department leads configure inspection standards without writing software or regex:
- **Mandatory Section Checklists** with strict severity weighting (`CRITICAL`, `WARNING`, `INFO`).
- **Numerical Threshold Alarms** (e.g. Budget variance \(\ge 10\%\), timeline slips \(\ge 7\) days).
- **Red-Flag Keyword Tripwires** (e.g. *litigation*, *structural crack*, *unauthorized change*).
- **Natural-Language Custom Rule Cards** (e.g. *"Ensure all subcontractor site visits cite an entry authorization permit"*).

### 3. Verifiable Scorecards & 1-Click Feedback Loop
- **Overall Compliance Score (0–100):** Deterministic scoring algorithm with penalty weighting.
- **Clickable Source Citations:** Every violation links directly to the verbatim quote and page number in the original report.
- **In-App Notification System:** Alerts the operator in real time with scorecard results as soon as reports are auto-evaluated or resubmitted.
- **1-Click Feedback Memo Generator:** Pre-populates a polite, professional revision request message ready to send to the author.
- **Resubmission with Version Tracking:** When reports are rejected, authors can revise and resubmit with full parent-child version tracking.
- **Supervisory Override:** Allows leads to resolve false-positive flags with an audit comment.

### 4. Phase 2: Self-Learning Knowledge Archive (Production RAG)
Features chat-style "Ask Archive" RAG Q&A with streamed responses and source citations. Solves the **5 Core RAG Failure Modes**:
- **Contextual Chunking:** Chunks are stamped with document-level and section breadcrumbs before embedding, eliminating fragmented context loss.
- **Hybrid Search + Reciprocal Rank Fusion (RRF):** Merges BM25 sparse keyword matching with dense vectors, ensuring exact alphanumeric codes (`PRJ-8842`), acronyms, and names are never missed.
- **Knowledge Reflection Engine:** Upon document approval, an asynchronous worker synthesizes 3-sentence cross-report insights, storing them with a **1.5× search ranking boost**.
- **Consolidation Worker:** Compresses reflections every 3 ingests into high-level organizational summaries (**1.8× boost**).

### 5. Enterprise Privacy Perimeter
Eliminates the dangerous practice of employees pasting sensitive internal reports into consumer chatboxes (ChatGPT, Claude). Direct enterprise API connections enforce zero model training and instant buffer deletion.

### 6. Single-Operator Master Password Authentication
Access is secured via a single environment-variable master password (`ADMIN_PASSWORD`), eliminating database user management and multi-user RBAC overhead:
- **Master Password Security:** Single-entry authentication configured directly in the environment, granting full operational access.
- **Zero RBAC Overhead:** Eliminates database user tables, role matrices, user registration flows, and credential reset management.
- **Unified Operator Workspace:** Provides a single, focused console for document ingestion, rule authoring, compliance scoring, and archive querying.

### 7. Automated Daily Database Backups
A daily automated PostgreSQL backup runs via cron inside Docker Compose, storing compressed dumps in a dedicated R2 backup bucket.

---

## 🗺️ Architectural Topology

The platform supports a streamlined single-operator review flow: **Ingest/Submit → Auto-evaluate → Review Scorecard → Approve/Reject → Archive**.

```mermaid
flowchart TD
    subgraph UI ["User Interface (Next.js App Router + Tailwind CSS 4 & shadcn/ui)"]
        WS["🏢 Department Switcher\n(/workspace)"]
        RB["⚙️ Hybrid Rule Builder\n(/rules/new)"]
        SUB["📄 Document Submission\n(/submit)"]
        UP["📂 Batch Dropzone\n(/batch)"]
        NOTIF_UI["🔔 Compliance Alerts\n(In-App Feed)"]
        SC["📊 Interactive Scorecard\n(/scorecard/[id])"]
        AA["🔍 'Ask Archive' QA Tab\n(/archive)"]
    end

    AUTH["🛡️ Auth Middleware\nMaster Password Validation (ADMIN_PASSWORD)"]

    subgraph API ["Server Layer (Route Handlers & Workers)"]
        EXTRACT["Contextual Extractor\n(unpdf / mammoth)"]
        BUDGET["Token Budget Bouncer\n(Pre-flight token guardrail)"]
        EVAL["Review Evaluator\n(Vercel AI SDK generateObject)"]
        NOTIF_SVC["In-App Notification Service\n(Poll-based alerts)"]
        REFL["Asynchronous Reflection Worker\n(3-sentence cross-report synthesis)"]
        HYBRID["Hybrid Search & RRF Engine\n(BM25 Sparse + Dense Vector)"]
    end

    subgraph Models ["Enterprise Model Provider (ENV Configured)"]
        DEFAULT_LLM["DEFAULT_MODEL in .env\nGoogle Gemini 3.8 Flash (@ai-sdk/google)\n[Swappable: DeepSeek / Kimi / Groq]"]
    end

    subgraph Storage ["Storage & Persistence"]
        DB[("Relational DB\nPostgreSQL + pgvector (Docker DB Service)")]
        BLOB[("Object Storage\nMinIO (Dev) / Cloudflare R2 (Prod)")]
    end

    WS --> AUTH
    RB --> AUTH
    SUB --> AUTH
    UP --> AUTH
    NOTIF_UI --> AUTH
    SC --> AUTH
    AA --> AUTH
    AUTH --> DB
    AUTH --> EXTRACT --> BUDGET --> EVAL
    SUB --> BLOB
    UP --> BLOB
    EVAL --> DEFAULT_LLM --> EVAL
    EVAL --> DB --> SC
    EVAL --> NOTIF_SVC --> NOTIF_UI
    SC -.->|When Approved| REFL
    SC -.->|When Rejected (Resubmit)| SUB
    REFL --> DB
    AUTH --> HYBRID --> DB
    HYBRID --> DEFAULT_LLM --> AA
```

---

## 💻 Tech Stack

| Layer | Technology | Specification / Role |
| :--- | :--- | :--- |
| **Framework** | Next.js 15+ (App Router) | React 19, Server Components, Route Handlers |
| **Styling** | Tailwind CSS 4 | Utility-first CSS modern styling engine |
| **Component Library** | shadcn/ui + AI Elements | Radix UI primitives and composable AI components |
| **AI Orchestration** | Vercel AI SDK | Structured object generation (`generateObject`) and streaming RAG (`streamText`) |
| **Model Provider** | Google Gemini 3.8 Flash | Enterprise model accessed directly via `@ai-sdk/google` |
| **Database & Vector Store** | PostgreSQL + pgvector | Relational entities, scorecards, and dense embeddings |
| **Object Storage** | MinIO (Dev) / Cloudflare R2 (Prod) | S3-compatible document storage for multi-page reports |

---

## 📚 Documentation Suite Navigation

The repository contains an exhaustive, production-grade technical documentation suite:

| Document | Primary Focus | Key Contents |
| :--- | :--- | :--- |
| **[`SPEC.md`](file:///c:/MY%20FILES/RAG/SPEC.md)** | Product & Functional Specification v3.5.0 | The "Mary Problem", ATS review paradigm, Gherkin user stories, scoring rubric formula, and non-goals. |
| **[`FRONTEND_SPEC.md`](file:///c:/MY%20FILES/RAG/FRONTEND_SPEC.md)** | Frontend UI/UX Specification v1.0.0 | Component composition, shadcn/ui + AI Elements, page wireframes, 60/40 Split-Screen Inspector, and state matrix. |
| **[`system_design.md`](file:///c:/MY%20FILES/RAG/system_design.md)** | Technical Architecture & System Design v3.5.0 | Architectural Decision Records (ADRs), Vercel AI SDK schemas, Contextual Chunking, RRF math, and DDL migrations. |
| **[`API_REFERENCE.md`](file:///c:/MY%20FILES/RAG/API_REFERENCE.md)** | REST API Reference v3.5.0 | Endpoints, session cookie headers, request/response schemas, SSE streaming, and error codes. |
| **[`implementation_plan.md`](file:///c:/MY%20FILES/RAG/implementation_plan.md)** | Engineering Roadmap & Delivery Plan v3.6.0 | 7-Sprint WBS, Testing Pyramid, Golden Dataset benchmarking, Risk Register, and Cost Economics. |
| **[`RULES_TEMPLATE.md`](file:///c:/MY%20FILES/RAG/RULES_TEMPLATE.md)** | Operational Rule Profiles & Manual v3.1.0 | Ready-to-use rule catalogs for PMO progress, field humanitarian logs, consulting audits, and rule authoring guidelines. |

---

## 🛠️ Quickstart & Local Development

### 1. Prerequisites
- **Node.js:** v18.18+ or v20+ (LTS recommended)
- **React 19**
- **Tailwind CSS 4**
- **shadcn/ui**
- **Package Manager:** `npm` or `pnpm`
- **Docker:** Docker Desktop or Docker Engine with Docker Compose

### 2. Environment Configuration
Create a `.env` file in the project root:

```env
# Authentication Configuration (Single-Operator Master Password)
ADMIN_PASSWORD=your_secure_password_here

# Server Port Configuration
PORT=3000

# AI Model Provider Configuration
DEFAULT_AI_PROVIDER="gemini"
GEMINI_API_KEY="your-google-gemini-api-key"
GEMINI_MODEL_NAME="gemini-3.8-flash"
GEMINI_EMBEDDING_MODEL="gemini-embedding-001"

# File Storage Configuration (Local uses MinIO via Docker)
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="ragadv-storage"
R2_BACKUP_BUCKET_NAME="your-backup-bucket"

# Token Budget Guardrails
MAX_INPUT_TOKENS_PER_REPORT=32000
MAX_OUTPUT_TOKENS_PER_SCORECARD=2000
RAG_DAILY_TOKEN_BUDGET=500000

# Database Connection
DATABASE_URL="postgres://postgres:postgres@localhost:5432/ragadv" # Local PostgreSQL
```

### 3. Installation & Scaffolding
```bash
# 1. Clone the repository
git clone https://github.com/organization/ragadv.git
cd ragadv

# 2. Configure environment variables (set ADMIN_PASSWORD)
cp .env.example .env
# Edit .env and set ADMIN_PASSWORD=your_secure_password_here

# 3. Initialize shadcn/ui components (required during setup)
npx shadcn@latest init

# 4. Start the self-hosted Docker Compose environment
# Services: app (Next.js), db (PostgreSQL + pgvector), minio (S3-compatible storage)
docker compose up -d

# 5. Run database migrations
npm run db:migrate
```

Navigate to [http://localhost:3000/login](http://localhost:3000/login) in your browser and enter your `ADMIN_PASSWORD` to log in.

> **Note:** `npx shadcn@latest init` is required during project setup.
>
> **Note:** A daily automated PostgreSQL backup runs via cron inside Docker Compose, storing compressed dumps in a dedicated R2 backup bucket.

---

## 💰 Operating Economics (At Scale)

Operating costs are highly efficient, utilizing a self-hosted architecture and direct model APIs:

> **Baseline Scenario:** 1 organization processing **20,000 multi-page reports per month** (average 8 pages / 3,200 tokens per report):
- **Document Ingestion & Rule Evaluation (Gemini 3.8 Flash):** \$10.00 / month
- **Structured Scorecard Generation (Gemini 3.8 Flash):** \$10.00 / month
- **Phase 2 Knowledge Reflection Synthesis:** \$2.00 / month
- **Vector Embeddings (Gemini Embedding):** \$1.00 / month
- **Hosting (Linux VPS):** ~$10.00 - \$20.00 / month
- **File Storage (Cloudflare R2):** Free tier (10GB), then \$0.015/GB/mo
- **Total Monthly Operating Cost:** **~\$33.00 - \$43.00 / month**

---

## 🛡️ License & Enterprise Governance

Internal Proprietary Architecture. Designed for enterprise on-premise or sovereign cloud deployments.
