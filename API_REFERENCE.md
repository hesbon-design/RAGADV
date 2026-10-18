# API Reference: RAGADV
## REST API Endpoints, Request/Response Schemas & Error Specifications
**Document Version:** 3.5.0  
**Document Status:** Approved Engineering Specification  
**Classification:** Internal Developer Documentation  
**Base URL:** `/api`  

---

## 1. Overview & Authentication

All API endpoints are implemented as **Next.js App Router Route Handlers**.

### Authentication & Session Management
All protected endpoints require a valid HTTP-only session cookie (`Cookie: session=...`). Single-person authentication validates against the system `ADMIN_PASSWORD` via `POST /api/auth/login`. Unauthenticated requests return `401 Unauthorized`.

### Request Formatting & Headers
All requests accepting JSON payloads must declare `Content-Type: application/json`. Multipart file uploads use `multipart/form-data`. Protected endpoints require the `Cookie: session=...` header.

---

## 2. Document Evaluation Endpoints

### 2.1 Batch Document Evaluation
Uploads one or more document files for bulk import.

*Note: `POST /api/batch` is for bulk imports and does NOT auto-evaluate. The user manually selects a rule profile and triggers evaluation later. This contrasts with `POST /api/reports` which auto-evaluates.*

- **Method:** `POST`
- **Path:** `/api/batch`
- **Content-Type:** `multipart/form-data`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Request Parameters (Form Data):
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `profileId` | string (UUID) | Yes | Identifier of the active Rule Profile to evaluate against. |
| `departmentId` | string (UUID) | Yes | Identifier of the active department workspace. |
| `files` | File[] (Binary) | Yes | Array of files to evaluate (PDF, DOCX, TXT, MD). Maximum 25 files per batch. |

#### Example cURL Request:
```bash
curl -X POST https://mary-engine.internal/api/evaluate \
  -H "Cookie: session=$SESSION_TOKEN" \
  -F "profileId=prof_pmo_weekly_v3" \
  -F "departmentId=dept_pmo_01" \
  -F "files=@Field_Report_Week12.pdf" \
  -F "files=@Site_Inspection_North.docx"
```

#### Successful Response (`200 OK`):

*Note: `overallScore` and `complianceStatus` in the response are computed server-side from per-rule verdicts, not by the LLM.*

```json
{
  "batchId": "batch_98f4a1b2-2026",
  "totalDocuments": 2,
  "results": [
    {
      "reportId": "rep_01J8F4A1B2",
      "filename": "Field_Report_Week12.pdf",
      "pageCount": 8,
      "scorecard": {
        "overallScore": 82,
        "complianceStatus": "ACTION_REQUIRED",
        "executiveSummary": [
          "Report covers week 12 construction milestones on the Northern Corridor bypass.",
          "Earthworks reached 88% completion; drainage culvert installation commenced.",
          "Expenditure overrun noted in heavy machinery fuel consumption."
        ],
        "ruleChecks": [
          {
            "ruleId": "sec_exec_summary",
            "ruleTitle": "Mandatory Executive Summary",
            "ruleCategory": "MANDATORY_SECTION",
            "status": "PASS",
            "severity": "CRITICAL",
            "evidenceQuote": "This report details progress for Week 12 on the Northern Corridor...",
            "pageNumber": 1
          },
          {
            "ruleId": "thresh_budget_variance",
            "ruleTitle": "Budget Variance Threshold (10%)",
            "ruleCategory": "NUMERICAL_THRESHOLD",
            "status": "WARNING",
            "severity": "WARNING",
            "evidenceQuote": "Fuel expenses reached $12,450 against forecasted $10,500 (+18.5%).",
            "pageNumber": 5,
            "remediationAdvice": "Fuel overrun exceeds 10%; attach site machinery idle log."
          }
        ],
        "detectedRedFlags": [
          {
            "severity": "WARNING",
            "keywordOrTopic": "equipment breakdown",
            "pageNumber": 6,
            "quote": "Excavator EX-04 suffered hydraulic failure on Tuesday morning.",
            "contextExplanation": "Machinery failure impacted drainage excavation schedule."
          }
        ],
        "feedbackDraft": "Dear Submitter, your Week 12 report has been reviewed. Please note that fuel expenses exceeded forecasted budget by 18.5% on page 5 without accompanying machinery idle logs. Please update Section 4 and resubmit."
      },
      "telemetry": {
        "inputTokens": 3410,
        "outputTokens": 642,
        "latencyMs": 4120
      }
    }
  ]
}
```

### 2.2 Streaming Batch Progress
Streams evaluation progress and scorecard updates for a batch. Returns a Server-Sent Events stream.

- **Method:** `GET`
- **Path:** `/api/batch/{id}/stream`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)
- **Response:** Server-Sent Events (SSE)

**Event Types:**
- `progress`: Payload `{ "completedCount": <int>, "totalCount": <int>, "currentDocumentTitle": <string> }`
- `scorecard`: Payload includes the completed scorecard JSON for the just-processed document
- `done`: Emitted when the batch is fully complete
- `error`: Emitted on stream or processing errors

---

## 3. Rule Profile Endpoints

### 3.1 List Rule Profiles
Returns all rule profiles configured for a department.

- **Method:** `GET`
- **Path:** `/api/rules?departmentId={deptId}`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Successful Response (`200 OK`):
```json
[
  {
    "id": "prof_pmo_weekly_v3",
    "departmentId": "dept_pmo_01",
    "title": "Weekly Progress & Milestone Review",
    "category": "PROJECT_MANAGEMENT",
    "mandatorySections": ["Executive Summary", "Milestone Schedule Table", "Budget & Expenditure Log"],
    "thresholdRules": [
      {
        "id": "t1",
        "metric": "BUDGET_VARIANCE",
        "operator": ">=",
        "thresholdValue": 10,
        "unit": "PERCENT",
        "severity": "CRITICAL"
      }
    ],
    "redFlagKeywords": ["litigation", "unapproved", "equipment breakdown"],
    "customRuleCards": [
      {
        "id": "c1",
        "instruction": "Verify that all subcontractor site visits cite an entry authorization permit number.",
        "severity": "WARNING"
      }
    ],
    "isActive": true,
    "createdAt": "2026-09-20T10:00:00Z"
  }
]
```

### 3.2 Create or Update Rule Profile
Saves a new or modified Rule Profile.

- **Method:** `POST`
- **Path:** `/api/rules`
- **Content-Type:** `application/json`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Request Payload:
```json
{
  "departmentId": "dept_pmo_01",
  "title": "Q4 Civil Engineering Site Review",
  "category": "PROJECT_MANAGEMENT",
  "mandatorySections": ["Executive Summary", "Safety Incident Log", "Milestone Table"],
  "thresholdRules": [
    {
      "metric": "SCHEDULE_SLIPPAGE",
      "operator": ">=",
      "thresholdValue": 7,
      "unit": "DAYS",
      "severity": "CRITICAL"
    }
  ],
  "redFlagKeywords": ["structural crack", "stop work order"],
  "customRuleCards": [
    {
      "instruction": "Ensure concrete pouring logs cite 28-day compressive strength test results.",
      "severity": "CRITICAL"
    }
  ]
}
```

### 3.3 List Rule Profile Versions
Returns all versions of a rule profile.

- **Method:** `GET`
- **Path:** `/api/rules/{id}/versions`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Successful Response (`200 OK`):
```json
[
  {
    "version": 3,
    "isActive": true,
    "createdAt": "2026-09-20T10:00:00Z"
  },
  {
    "version": 2,
    "isActive": false,
    "createdAt": "2026-08-15T09:30:00Z"
  }
]
```

---

## 4. Report Action & Approval Endpoints

### 4.1 Submit Single Report
Uploads a single document file to R2, extracts text, fetches the department's default rule profile, runs auto-evaluation, and stores the resulting scorecard.

- **Method:** `POST`
- **Path:** `/api/reports`
- **Content-Type:** `multipart/form-data`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Request Parameters (Form Data):
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `file` | File (Binary) | Yes | The file to upload (PDF, DOCX, TXT). |
| `title` | string | No | Optional title for the report. |
| `notes` | string | No | Optional notes for the report. |
| `parentReportId` | string (UUID) | No | Identifier for resubmissions of rejected reports. |

#### Successful Response (`201 Created`):
```json
{
  "reportId": "rep_02K9G5B2C3",
  "title": "Site Inspection North",
  "status": "PENDING_REVIEW",
  "scorecardId": "score_12345",
  "overallScore": 88,
  "complianceStatus": "ACTION_REQUIRED",
  "parentReportId": null
}
```

#### Errors:
- `400`: If no default rule profile is set for the department.
- `413`: If file exceeds size limit.
- `429`: If daily token budget exceeded.

### 4.2 Get Report
Retrieves a specific report and its scorecard by ID. Access is global with no user-scoping constraints.

- **Method:** `GET`
- **Path:** `/api/reports/{id}`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

### 4.3 Approve Report
Approves a report and triggers asynchronous Phase 2 Knowledge Reflection.

- **Method:** `POST`
- **Path:** `/api/reports/{id}/approve`
- **Content-Type:** `application/json`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Request Payload:
```json
{
  "notes": "Reviewed and verified against contractor receipts."
}
```

#### Successful Response (`200 OK`):
```json
{
  "reportId": "rep_01J8F4A1B2",
  "status": "APPROVED",
  "reflectionQueued": true,
  "approvedAt": "2026-09-28T15:45:00Z"
}
```

### 4.4 Re-Evaluate Report
Re-evaluates an existing report. Returns the new scorecard. The old scorecard is archived with an `archived_at` timestamp.

- **Method:** `POST`
- **Path:** `/api/reports/{id}/re-evaluate`
- **Content-Type:** `application/json`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Request Payload:
```json
{
  "ruleProfileId": "prof_pmo_weekly_v4" // Optional. Defaults to the same profile used originally.
}
```

#### Successful Response (`200 OK`):
Returns the new scorecard object.

### 4.5 Delete Report
Performs a soft-delete (sets `deleted_at` timestamp). Reversible within 30 days via restore.

- **Method:** `DELETE`
- **Path:** `/api/reports/{id}`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Successful Response:
Returns `204 No Content`.

### 4.6 Restore Report
Clears the `deleted_at` timestamp.

- **Method:** `POST`
- **Path:** `/api/reports/{id}/restore`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Successful Response (`200 OK`):
Returns the restored report object. Returns `404` if permanently purged.

### 4.7 Retry Report Evaluation
Retries a failed LLM evaluation for a specific report that is in `PENDING_EVALUATION` status with an error.

- **Method:** `POST`
- **Path:** `/api/reports/{id}/retry`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Successful Response (`200 OK`):
Triggers re-evaluation and returns the SSE stream for that single document.

---

## 5. Phase 2: Archive Search Endpoints

### 5.1 "Ask Archive" Hybrid QA Query
Executes a hybrid search (BM25 + Dense Vectors with RRF) over approved reports and reflection artifacts.

- **Method:** `POST`
- **Path:** `/api/archive/query`
- **Content-Type:** `application/json`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Request Payload:
```json
{
  "query": "What were the recurring causes of equipment breakdown in Q2?",
  "departmentId": "dept_pmo_01",
  "filters": {
    "dateRange": {
      "from": "2026-04-01T00:00:00Z",
      "to": "2026-06-30T23:59:59Z"
    },
    "docType": "all" // "all", "raw", "reflection", "summary"
  },
  "topK": 5
}
```

#### Successful Response (`200 OK`):
```json
{
  "query": "What were the recurring causes of equipment breakdown in Q2?",
  "synthesizedAnswer": "Across Q2 reports, equipment downtime was primarily driven by delayed spare parts for hydraulic excavators (cited in Week 14, 18, and 21) and contaminated diesel shipments at the North Site during heavy rains in May.",
  "sources": [
    {
      "docType": "reflection",
      "title": "Synthesis of Weeks 14-22 Equipment Logs",
      "reflectionScore": 1.5,
      "quote": "Repeated excavator hydraulic failures caused 12 cumulative days of earthwork stoppage...",
      "parentReport": "Field_Report_W21.pdf"
    },
    {
      "docType": "raw",
      "title": "Field_Report_W18.pdf",
      "pageNumber": 4,
      "quote": "Excavator EX-02 remained idle awaiting replacement seals from Nairobi."
    }
  ]
}
```

### 5.2 "Ask Archive" Query
Submits a RAG query against approved reports.

- **Method:** `POST`
- **Path:** `/api/archive/ask`
- **Content-Type:** `application/json`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Request Payload:
```json
{
  "question": "string",
  "filters": {
    "dateFrom": "ISO date (optional)",
    "dateTo": "ISO date (optional)",
    "keyword": "string (optional)"
  }
}
```

#### Successful Response (`200 OK`):
Server-Sent Events stream (same pattern as batch stream).

**Event Types:**
- `chunk`: `{ "text": "string" }` — streamed answer tokens
- `sources`: `{ "sources": [{ "documentId": "string", "title": "string", "approvedAt": "ISO date", "excerpt": "string", "pageNumber": number }] }` — emitted once after answer completes
- `done`: `{}` — stream complete
- `error`: `{ "code": "string", "message": "string" }` — on failure

**Rate Limiting:** Subject to daily token budget. Returns `429 Too Many Requests` with `{ "code": "DAILY_TOKEN_BUDGET_EXCEEDED", "message": "Daily query limit reached. Resets at midnight.", "resetAt": "ISO datetime" }` when budget exhausted.

**Department Scoping:** Results are filtered to the specified department. Queries outside the target department return empty results (not 403).

---

## 6. Authentication Endpoints

### 6.1 Login
Accepts credentials, validates against `ADMIN_PASSWORD`, and sets an HTTP-only session cookie.

- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Content-Type:** `application/json`
- **Authentication:** Not required

#### Request Payload:
```json
{
  "password": "string"
}
```

#### Example cURL Request:
```bash
curl -X POST https://mary-engine.internal/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "secret_admin_password"}'
```

#### Successful Response (`200 OK`):
Sets HTTP-only cookie: `Set-Cookie: session=<token>; Path=/; HttpOnly; SameSite=Lax`.
```json
{
  "authenticated": true
}
```

#### Errors:
- `400 Bad Request`: `{ "error": "Password is required" }` - Request body failed validation.
- `401 Unauthorized`: `{ "error": "Invalid password" }` - Password does not match `ADMIN_PASSWORD`.

### 6.2 Logout
Clears the session cookie and invalidates the session.

- **Method:** `POST`
- **Path:** `/api/auth/logout`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Example cURL Request:
```bash
curl -X POST https://mary-engine.internal/api/auth/logout \
  -H "Cookie: session=$SESSION_TOKEN"
```

#### Successful Response (`200 OK`):
Clears the session cookie (`Set-Cookie: session=; Path=/; Max-Age=0`).
```json
{
  "success": true
}
```

### 6.3 Session Verification
Checks session validity.

- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Headers:** `Cookie: session=...`
- **Authentication:** Session Cookie verification

#### Example cURL Request:
```bash
curl -X GET https://mary-engine.internal/api/auth/me \
  -H "Cookie: session=$SESSION_TOKEN"
```

#### Successful Response (`200 OK`):
```json
{
  "authenticated": true
}
```
*Note: Returns `{ "authenticated": false }` if the session cookie is absent or invalid.*

---

## 7. System Audit Endpoints

### 7.1 Get Audit Logs
Retrieves system audit logs.

- **Method:** `GET`
- **Path:** `/api/audit-logs`
- **Headers:** `Cookie: session=...`
- **Authentication:** Required (Session Cookie)

#### Query Parameters:
| Parameter | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `userId` | string | No | Filter by specific user. |
| `action` | string | No | Filter by action type (e.g. `report.approved`, `rule.created`). |
| `departmentId` | string | No | Filter by department. |
| `dateFrom` | string | No | Filter by start date (ISO date). |
| `dateTo` | string | No | Filter by end date (ISO date). |
| `page` | number | No | Page number (default: 1). |
| `limit` | number | No | Results per page (default: 50). |

#### Successful Response (`200 OK`):
```json
{
  "data": [
    {
      "id": "string",
      "userId": "string",
      "userName": "string",
      "action": "string",
      "resourceType": "string",
      "resourceId": "string",
      "departmentId": "string",
      "metadata": {},
      "createdAt": "ISO datetime"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120
  }
}
```

---

## 8. HTTP Status & Error Codes

| Status Code | Error Identifier | Meaning & Client Action |
| :---: | :--- | :--- |
| **`400`** | `INVALID_PAYLOAD` | Request JSON or form data failed Zod schema validation. |
| **`401`** | `UNAUTHORIZED` | Unauthenticated requests without a valid session cookie. |
| **`403`** | `FORBIDDEN` | Request is not authorized for the requested resource. |
| **`404`** | `RESOURCE_NOT_FOUND` | Specified `profileId`, `reportId`, or `departmentId` does not exist. |
| **`413`** | `TOKEN_BUDGET_EXCEEDED` | Uploaded document exceeds 32,000 estimated tokens. Split the document into smaller chapters. |
| **`422`** | `FILE_UNREADABLE_SCANNED` | PDF contains < 50 selectable characters (scanned image). Upload digital text version. |
| **`429`** | `RATE_LIMIT_EXCEEDED` | LLM provider token quota exceeded. Engine retries automatically with exponential backoff. |
| **`429`** | `DAILY_TOKEN_BUDGET_EXCEEDED` | Daily query token budget has been exhausted. |
| **`500`** | `INTERNAL_ENGINE_ERROR` | Unhandled runtime exception logged to system telemetry. |
