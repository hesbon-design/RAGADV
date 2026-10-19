import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";
import { createHash } from "crypto";

export const EMBEDDING_DIMENSION = 768;

/**
 * Deterministic fallback embedding generator for offline testing and keyless development.
 * Uses a token-hashing trick combined with text-level seeding to produce normalized 768-d vectors.
 * Texts with common tokens produce correlated cosine similarities.
 */
export function generateDeterministicEmbedding(text: string): number[] {
  const vec = new Float64Array(EMBEDDING_DIMENSION);

  // Normalize text tokens
  const clean = text.toLowerCase().trim();
  const tokens = clean.split(/[^a-z0-9_-]+/).filter(Boolean);

  // Base seed hash from full string
  const baseHash = createHash("sha256").update(clean).digest();
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    const byte = baseHash[i % baseHash.length];
    vec[i] = ((byte / 127.5) - 1.0) * 0.1;
  }

  // Token-level feature hashing
  for (const token of tokens) {
    const tokenHash = createHash("md5").update(token).digest();
    const idx = tokenHash.readUInt16BE(0) % EMBEDDING_DIMENSION;
    const sign = tokenHash[2] % 2 === 0 ? 1 : -1;
    vec[idx] += sign * 1.0;

    // Secondary hash bucket for dispersion
    const idx2 = tokenHash.readUInt16BE(4) % EMBEDDING_DIMENSION;
    const sign2 = tokenHash[6] % 2 === 0 ? 0.5 : -0.5;
    vec[idx2] += sign2;
  }

  // Compute L2 norm
  let sumSq = 0;
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq) || 1.0;

  // L2 normalize
  const result: number[] = new Array(EMBEDDING_DIMENSION);
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    result[i] = Number((vec[i] / norm).toFixed(6));
  }

  return result;
}

/**
 * Generate a 768-dimensional dense vector embedding for a single text.
 * Uses Google Gemini API (text-embedding-004) when GEMINI_API_KEY is available,
 * with deterministic fallback for offline tests.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const modelName = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
      const { embedding } = await embed({
        model: google.textEmbeddingModel(modelName),
        value: text,
      });

      if (embedding && embedding.length === EMBEDDING_DIMENSION) {
        return embedding;
      }
      console.warn(
        `Gemini embedding returned ${embedding?.length} dimensions instead of ${EMBEDDING_DIMENSION}. Using fallback.`
      );
    } catch (err) {
      console.warn("Failed to generate Gemini embedding, using deterministic fallback:", err);
    }
  }

  return generateDeterministicEmbedding(text);
}

/**
 * Generate 768-dimensional dense vector embeddings for an array of texts.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const modelName = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
      const { embeddings } = await embedMany({
        model: google.textEmbeddingModel(modelName),
        values: texts,
      });

      if (embeddings && embeddings.length === texts.length) {
        return embeddings;
      }
    } catch (err) {
      console.warn("Failed to generate batch Gemini embeddings, using deterministic fallback:", err);
    }
  }

  return texts.map((t) => generateDeterministicEmbedding(t));
}
