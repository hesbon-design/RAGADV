/**
 * RAGADV Automated Daily Database Snapshot & Backup Utility
 * Exports database tables and metadata to timestamped JSON/SQL archives.
 */

const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://ragadv:ragadv_dev_password@localhost:5432/ragadv";

const backupDir = path.join(process.cwd(), "data", "backups");

async function runBackup() {
  console.log("[Backup] Initializing database snapshot...");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const sql = postgres(connectionString, { max: 1 });

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const snapshotFile = path.join(backupDir, `ragadv_backup_${timestamp}.json`);

    const tables = [
      "departments",
      "rule_profiles",
      "rule_profile_versions",
      "reports",
      "scorecards",
      "rule_checks",
      "archive_chunks",
      "audit_logs",
    ];

    const backupData = {
      version: "3.6.0",
      createdAt: new Date().toISOString(),
      database: "ragadv",
      tables: {},
    };

    for (const table of tables) {
      const rows = await sql`SELECT * FROM ${sql(table)}`;
      backupData.tables[table] = rows;
      console.log(`[Backup] Table ${table}: ${rows.length} records backed up.`);
    }

    fs.writeFileSync(snapshotFile, JSON.stringify(backupData, null, 2), "utf-8");
    console.log(`[Backup] Snapshot successfully written to: ${snapshotFile}`);

    await sql.end();
    return snapshotFile;
  } catch (err) {
    console.error("[Backup] Backup failed:", err);
    await sql.end();
    process.exit(1);
  }
}

if (require.main === module) {
  runBackup();
}

module.exports = { runBackup };
