import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = process.env.DATABASE_PATH || "./data/ragadv.db";
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize Schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      default_rule_profile_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rule_profiles (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rule_profile_versions (
      id TEXT PRIMARY KEY,
      rule_profile_id TEXT NOT NULL REFERENCES rule_profiles(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      mandatory_sections TEXT NOT NULL, -- JSON array of strings
      threshold_rules TEXT NOT NULL,    -- JSON array of objects
      red_flag_keywords TEXT NOT NULL,   -- JSON array of strings
      custom_rule_cards TEXT NOT NULL,   -- JSON array of objects
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

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
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP WITH TIME ZONE,
      deleted_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS scorecards (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
      overall_score INTEGER NOT NULL,
      compliance_status TEXT NOT NULL CHECK(compliance_status IN ('APPROVED', 'ACTION_REQUIRED', 'REJECTED')),
      executive_summary TEXT, -- JSON array of summary strings
      feedback_draft TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      latency_ms REAL DEFAULT 0,
      generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    );

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

    CREATE TABLE IF NOT EXISTS archive_chunks (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      parent_report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      doc_type TEXT NOT NULL CHECK(doc_type IN ('raw', 'reflection', 'summary')),
      content TEXT NOT NULL,
      reflection_score REAL DEFAULT 1.0,
      source_references TEXT, -- JSON array
      embedding BLOB,         -- Float32 vector blob or JSON
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      metadata TEXT, -- JSON payload
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_reports_dept_status ON reports(department_id, review_status);
    CREATE INDEX IF NOT EXISTS idx_archive_dept ON archive_chunks(department_id);
    CREATE INDEX IF NOT EXISTS idx_archive_parent ON archive_chunks(parent_report_id);
  `);

  // Seed default department and standard rule profile if empty
  const deptCount = db.prepare("SELECT COUNT(*) as count FROM departments").get() as { count: number };
  if (deptCount.count === 0) {
    const defaultDeptId = "dept-engineering";
    const defaultProfileId = "prof-standard-eng";
    const defaultVersionId = "ver-standard-eng-1";

    db.prepare(`
      INSERT INTO departments (id, name, slug, default_rule_profile_id)
      VALUES (?, ?, ?, ?)
    `).run(defaultDeptId, "Engineering Operations", "engineering", defaultProfileId);

    db.prepare(`
      INSERT INTO rule_profiles (id, department_id, title, category, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(defaultProfileId, defaultDeptId, "Standard Engineering Progress Audit", "Engineering");

    db.prepare(`
      INSERT INTO rule_profile_versions (
        id, rule_profile_id, version_number, mandatory_sections, threshold_rules, red_flag_keywords, custom_rule_cards
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      defaultVersionId,
      defaultProfileId,
      1,
      JSON.stringify([
        "Executive Summary",
        "Milestone Progress Matrix",
        "Risk Register",
        "Financial Expenditure Log",
        "Quality Assurance Sign-off"
      ]),
      JSON.stringify([
        {
          id: "thresh-budget",
          metric_name: "Budget Variance Ceiling",
          operator: "<=",
          target_value: 10.0,
          unit: "%",
          penalty: 20,
          is_critical: true
        },
        {
          id: "thresh-delay",
          metric_name: "Schedule Slippage",
          operator: "<=",
          target_value: 14,
          unit: "days",
          penalty: 15,
          is_critical: false
        }
      ]),
      JSON.stringify([
        "stop work order",
        "unapproved subcontractor",
        "safety breach",
        "unauthorized delay",
        "regulatory violation"
      ]),
      JSON.stringify([
        {
          id: "custom-safety",
          title: "Safety Incident Verification",
          description: "All safety incidents or near misses mentioned in the narrative must include corrective action documentation.",
          weight: 15,
          severity: "CRITICAL"
        }
      ])
    );
  }
}

// Auto-run schema initialization
initDatabase();
