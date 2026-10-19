import crypto from "crypto";
import { sql } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";
import { parseDocument } from "@/lib/parsers";
import { chunkDocument } from "@/lib/chunker";
import { generateEmbeddings } from "@/lib/embeddings";
import { reflectOnApproval } from "@/lib/reflection";

export interface IngestReportResult {
  reportId: string;
  chunksCount: number;
  departmentId: string;
}

/**
 * Automatically contextually chunks, embeds, and indexes an approved report into archive_chunks.
 * Safe and idempotent: overwrites existing chunks for the same report ID.
 */
export async function ingestReportToArchive(
  reportId: string,
  providedText?: string
): Promise<IngestReportResult> {
  const reports = await sql`
    SELECT 
      r.id, 
      r.department_id, 
      r.filename, 
      r.storage_path, 
      r.uploaded_at,
      d.name as department_name
    FROM reports r
    JOIN departments d ON r.department_id = d.id
    WHERE r.id = ${reportId} AND r.deleted_at IS NULL
  `;

  if (reports.length === 0) {
    throw new Error(`Report not found or deleted: ${reportId}`);
  }

  const report = reports[0];

  // 1. Resolve document text
  let docText = providedText;
  if (!docText) {
    const fileBuffer = await readStoredFile(report.storage_path);
    const parsed = await parseDocument(fileBuffer, report.filename);
    docText = parsed.text;
  }

  if (!docText || !docText.trim()) {
    return { reportId, chunksCount: 0, departmentId: report.department_id };
  }

  // 2. Chunk document contextually
  const dateStr = report.uploaded_at instanceof Date
    ? report.uploaded_at.toISOString().split("T")[0]
    : typeof report.uploaded_at === "string"
    ? report.uploaded_at.split("T")[0]
    : new Date().toISOString().split("T")[0];

  const chunks = chunkDocument(docText, {
    filename: report.filename,
    departmentName: report.department_name,
    date: dateStr,
  });

  if (chunks.length === 0) {
    return { reportId, chunksCount: 0, departmentId: report.department_id };
  }

  // 3. Generate dense vector embeddings
  const chunkTexts = chunks.map((c) => c.content);
  const embeddings = await generateEmbeddings(chunkTexts);

  // 4. Persist chunks atomically
  await sql.begin(async (trx) => {
    // Clean up previous chunks for idempotency
    await trx`DELETE FROM archive_chunks WHERE parent_report_id = ${reportId}`;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const emb = embeddings[i];
      const vecStr = `[${emb.join(",")}]`;
      const chunkId = `achk_${crypto.randomUUID().replace(/-/g, "")}`;
      const sourceReferences = {
        reportId,
        filename: report.filename,
        chunkIndex: chunk.index,
        totalChunks: chunks.length,
        section: chunk.section,
        tokenCount: chunk.tokenCount,
      };

      await trx`
        INSERT INTO archive_chunks (
          id,
          department_id,
          parent_report_id,
          doc_type,
          content,
          reflection_score,
          source_references,
          embedding
        )
        VALUES (
          ${chunkId},
          ${report.department_id},
          ${reportId},
          'raw',
          ${chunk.content},
          1.0,
          ${trx.json(sourceReferences)},
          ${vecStr}::vector
        )
      `;
    }

    // Log archive ingestion audit
    await trx`
      INSERT INTO audit_logs (id, department_id, action, metadata)
      VALUES (
        ${`log_arch_${crypto.randomUUID().replace(/-/g, "")}`},
        ${report.department_id},
        'ARCHIVE_CHUNKS_INGESTED',
        ${trx.json({
          reportId,
          filename: report.filename,
          chunksCount: chunks.length,
          docType: 'raw',
        })}
      )
    `;
  });

  // Trigger Knowledge Reflection asynchronously (non-blocking)
  try {
    await reflectOnApproval(reportId, report.department_id);
  } catch (reflErr) {
    console.warn("Knowledge reflection trigger warning:", reflErr);
  }

  return {
    reportId,
    chunksCount: chunks.length,
    departmentId: report.department_id,
  };
}

/**
 * Remove chunks for a report from archive_chunks (e.g. if review status is revoked).
 */
export async function purgeReportFromArchive(reportId: string): Promise<void> {
  await sql.begin(async (trx) => {
    const deleted = await trx`
      DELETE FROM archive_chunks 
      WHERE parent_report_id = ${reportId} 
      RETURNING department_id
    `;

    if (deleted.length > 0) {
      await trx`
        INSERT INTO audit_logs (id, department_id, action, metadata)
        VALUES (
          ${`log_purge_${crypto.randomUUID().replace(/-/g, "")}`},
          ${deleted[0].department_id},
          'ARCHIVE_CHUNKS_PURGED',
          ${trx.json({
            reportId,
            deletedCount: deleted.length,
          })}
        )
      `;
    }
  });
}
