import { sql } from "@/lib/db";
import { generateEmbedding } from "@/lib/embeddings";

export interface SearchOptions {
  query: string;
  departmentId?: string;
  docType?: "all" | "raw" | "reflection" | "summary";
  limit?: number;
  minScore?: number;
}

export interface SearchResultChunk {
  id: string;
  departmentId: string;
  parentReportId: string;
  docType: "raw" | "reflection" | "summary";
  content: string;
  reflectionScore: number;
  sourceReferences: Record<string, any>;
  rrfScore: number;
  ranks: {
    vectorRank?: number;
    ftsRank?: number;
  };
  scores: {
    vectorCosine?: number;
    ftsRankCd?: number;
  };
}

const DOC_TYPE_MULTIPLIERS: Record<string, number> = {
  summary: 1.8,
  reflection: 1.5,
  raw: 1.0,
};

const RRF_K = 60;

/**
 * Executes dual-channel Hybrid Search combining pgvector cosine distance and PostgreSQL FTS,
 * fused via Reciprocal Rank Fusion (RRF k=60) with document-type reflection multipliers.
 */
export async function hybridSearch(options: SearchOptions): Promise<SearchResultChunk[]> {
  const { query, departmentId, docType, limit = 5 } = options;
  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return [];
  }

  const activeDocType = docType && docType !== "all" ? docType : null;

  // 1. Channel A: Dense Vector Retrieval (Top 20)
  const queryEmbedding = await generateEmbedding(cleanQuery);
  const vecStr = `[${queryEmbedding.join(",")}]`;

  const vectorRows = await sql`
    SELECT 
      id,
      department_id,
      parent_report_id,
      doc_type,
      content,
      reflection_score,
      source_references,
      (1 - (embedding <=> ${vecStr}::vector)) AS vector_score
    FROM archive_chunks
    WHERE (${departmentId || null}::text IS NULL OR department_id = ${departmentId || null})
      AND (${activeDocType}::text IS NULL OR doc_type = ${activeDocType})
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vecStr}::vector ASC
    LIMIT 20
  `;

  // 2. Channel B: PostgreSQL Full-Text Search Retrieval (Top 20)
  let ftsRows: any[] = [];
  try {
    ftsRows = await sql`
      SELECT 
        id,
        department_id,
        parent_report_id,
        doc_type,
        content,
        reflection_score,
        source_references,
        ts_rank_cd(fts_vector, plainto_tsquery('english', ${cleanQuery})) AS fts_score
      FROM archive_chunks
      WHERE fts_vector @@ plainto_tsquery('english', ${cleanQuery})
        AND (${departmentId || null}::text IS NULL OR department_id = ${departmentId || null})
        AND (${activeDocType}::text IS NULL OR doc_type = ${activeDocType})
      ORDER BY fts_score DESC
      LIMIT 20
    `;
  } catch (err) {
    console.warn("FTS query failed, continuing with vector-only results:", err);
  }

  // 3. Reciprocal Rank Fusion (RRF)
  const chunkMap = new Map<
    string,
    {
      chunk: any;
      vectorRank?: number;
      ftsRank?: number;
      vectorScore?: number;
      ftsScore?: number;
      rawRRF: number;
    }
  >();

  // Tally vector channel ranks
  vectorRows.forEach((row, idx) => {
    const rank = idx + 1;
    chunkMap.set(row.id, {
      chunk: row,
      vectorRank: rank,
      vectorScore: Number(row.vector_score),
      rawRRF: 1 / (RRF_K + rank),
    });
  });

  // Tally FTS channel ranks
  ftsRows.forEach((row, idx) => {
    const rank = idx + 1;
    const existing = chunkMap.get(row.id);
    if (existing) {
      existing.ftsRank = rank;
      existing.ftsScore = Number(row.fts_score);
      existing.rawRRF += 1 / (RRF_K + rank);
    } else {
      chunkMap.set(row.id, {
        chunk: row,
        ftsRank: rank,
        ftsScore: Number(row.fts_score),
        rawRRF: 1 / (RRF_K + rank),
      });
    }
  });

  // 4. Apply Knowledge Reflection Multipliers & Sort
  const fusedResults: SearchResultChunk[] = Array.from(chunkMap.values()).map((entry) => {
    const c = entry.chunk;
    const docType = c.doc_type as "raw" | "reflection" | "summary";
    const multiplier = DOC_TYPE_MULTIPLIERS[docType] || 1.0;
    const reflectionScore = Number(c.reflection_score) || 1.0;

    const finalRRF = Number((entry.rawRRF * multiplier * reflectionScore).toFixed(6));

    return {
      id: c.id,
      departmentId: c.department_id,
      parentReportId: c.parent_report_id,
      docType,
      content: c.content,
      reflectionScore,
      sourceReferences: typeof c.source_references === "string"
        ? JSON.parse(c.source_references)
        : (c.source_references || {}),
      rrfScore: finalRRF,
      ranks: {
        vectorRank: entry.vectorRank,
        ftsRank: entry.ftsRank,
      },
      scores: {
        vectorCosine: entry.vectorScore,
        ftsRankCd: entry.ftsScore,
      },
    };
  });

  fusedResults.sort((a, b) => b.rrfScore - a.rrfScore);

  const finalLimit = Math.max(1, Math.min(limit, 50));
  return fusedResults.slice(0, finalLimit);
}
