import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://ragadv:ragadv_dev_password@localhost:5432/ragadv";

declare global {
  var _sql: ReturnType<typeof postgres> | undefined;
}

export const sql =
  global._sql ||
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // Essential for Supabase/PgBouncer pooler compatibility
  });

if (process.env.NODE_ENV !== "production") {
  global._sql = sql;
}

let isInitialized = false;

export async function initDatabase() {
  if (isInitialized) return;

  try {
    // 1. Enable pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;

    // 2. Create core tables
    await sql`
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        default_rule_profile_id TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS rule_profiles (
        id TEXT PRIMARY KEY,
        department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS rule_profile_versions (
        id TEXT PRIMARY KEY,
        rule_profile_id TEXT NOT NULL REFERENCES rule_profiles(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        mandatory_sections JSONB NOT NULL,
        threshold_rules JSONB NOT NULL,
        red_flag_keywords JSONB NOT NULL,
        custom_rule_cards JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
        rule_profile_version_id TEXT REFERENCES rule_profile_versions(id) ON DELETE SET NULL,
        parent_report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
        filename TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        page_count INTEGER NOT NULL DEFAULT 1,
        review_status TEXT NOT NULL CHECK(review_status IN ('PROCESSING', 'PENDING_REVIEW', 'APPROVED', 'ACTION_REQUIRED', 'REJECTED')),
        uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMPTZ,
        deleted_at TIMESTAMPTZ
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS scorecards (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
        overall_score INTEGER NOT NULL,
        compliance_status TEXT NOT NULL CHECK(compliance_status IN ('APPROVED', 'ACTION_REQUIRED', 'REJECTED')),
        executive_summary JSONB,
        feedback_draft TEXT,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        latency_ms REAL DEFAULT 0,
        generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMPTZ
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS rule_checks (
        id TEXT PRIMARY KEY,
        scorecard_id TEXT NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
        rule_id TEXT NOT NULL,
        rule_title TEXT NOT NULL,
        rule_type TEXT NOT NULL CHECK(rule_type IN ('mandatory_section', 'threshold_breach', 'red_flag', 'custom')),
        verdict TEXT NOT NULL CHECK(verdict IN ('PASS', 'FAIL', 'WARNING')),
        penalty_applied INTEGER NOT NULL DEFAULT 0,
        finding_summary TEXT NOT NULL,
        cited_evidence TEXT,
        page_number INTEGER
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS archive_chunks (
        id TEXT PRIMARY KEY,
        department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        parent_report_id TEXT REFERENCES reports(id) ON DELETE CASCADE,
        doc_type TEXT NOT NULL CHECK(doc_type IN ('raw', 'reflection', 'summary')),
        content TEXT NOT NULL,
        reflection_score REAL DEFAULT 1.0,
        source_references JSONB,
        embedding vector(768),
        fts_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        metadata JSONB,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`ALTER TABLE archive_chunks ALTER COLUMN parent_report_id DROP NOT NULL;`.catch(() => {});
    await sql`ALTER TABLE archive_chunks ADD COLUMN IF NOT EXISTS fts_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reports_dept_status ON reports(department_id, review_status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_archive_dept ON archive_chunks(department_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_archive_parent ON archive_chunks(parent_report_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_archive_fts ON archive_chunks USING GIN (fts_vector);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_archive_embedding ON archive_chunks USING hnsw (embedding vector_cosine_ops);`;

    // 3. Seed default department & starter profile if empty
    const deptRows = await sql`SELECT COUNT(*)::int as count FROM departments;`;
    if (deptRows[0]?.count === 0) {
      const defaultDeptId = "dept-engineering";
      const defaultProfileId = "prof-standard-eng";
      const defaultVersionId = "ver-standard-eng-1";

      await sql`
        INSERT INTO departments (id, name, slug, default_rule_profile_id)
        VALUES (${defaultDeptId}, 'Engineering Operations', 'engineering', ${defaultProfileId});
      `;

      await sql`
        INSERT INTO rule_profiles (id, department_id, title, category, is_active)
        VALUES (${defaultProfileId}, ${defaultDeptId}, 'Standard Engineering Progress Audit', 'Engineering', 1);
      `;

      await sql`
        INSERT INTO rule_profile_versions (
          id, rule_profile_id, version_number, mandatory_sections, threshold_rules, red_flag_keywords, custom_rule_cards
        )
        VALUES (
          ${defaultVersionId},
          ${defaultProfileId},
          1,
          ${sql.json([
            "Executive Summary",
            "Milestone Progress Matrix",
            "Risk Register",
            "Financial Expenditure Log",
            "Quality Assurance Sign-off",
          ])},
          ${sql.json([
            {
              id: "thresh-budget",
              metric_name: "Budget Variance Ceiling",
              operator: "<=",
              target_value: 10.0,
              unit: "%",
              penalty: 20,
              is_critical: true,
            },
            {
              id: "thresh-delay",
              metric_name: "Schedule Slippage",
              operator: "<=",
              target_value: 14,
              unit: "days",
              penalty: 15,
              is_critical: false,
            },
          ])},
          ${sql.json([
            "stop work order",
            "unapproved subcontractor",
            "safety breach",
            "unauthorized delay",
            "regulatory violation",
          ])},
          ${sql.json([
            {
              id: "custom-safety",
              title: "Safety Incident Verification",
              description:
                "All safety incidents or near misses mentioned in the narrative must include corrective action documentation.",
              weight: 15,
              severity: "CRITICAL",
            },
          ])}
        );
      `;
    }

    isInitialized = true;
  } catch (err) {
    console.error("Database schema initialization error:", err);
    throw err;
  }
}
