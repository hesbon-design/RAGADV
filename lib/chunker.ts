export interface ContextualChunk {
  index: number;
  content: string;
  rawText: string;
  header: string;
  section: string;
  tokenCount: number;
}

export interface ChunkingOptions {
  filename: string;
  departmentName: string;
  date?: string;
  maxTokens?: number;
  overlapTokens?: number;
}

function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * 1.3);
}

function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^#{1,6}\s+/.test(trimmed)) return true;
  if (/^\d+(\.\d+)*\s+[A-Z]/.test(trimmed)) return true;
  // Known section names or short title-cased lines without sentence punctuation
  if (
    trimmed.length < 60 &&
    !trimmed.endsWith(".") &&
    !trimmed.endsWith(",") &&
    !trimmed.endsWith(";") &&
    /^[A-Z][A-Za-z0-9\s:_-]+$/.test(trimmed)
  ) {
    return true;
  }
  return false;
}

export function chunkDocument(
  text: string,
  options: ChunkingOptions
): ContextualChunk[] {
  const {
    filename,
    departmentName,
    date = new Date().toISOString().split("T")[0],
    maxTokens = 800,
    overlapTokens = 200,
  } = options;

  const rawParagraphs = text.split(/\r?\n\s*\r?\n/);
  const chunks: ContextualChunk[] = [];

  let currentSection = "General Overview";
  let currentWords: string[] = [];
  let chunkIndex = 0;

  const flushChunk = (wordsToInclude: string[], sectionName: string) => {
    if (wordsToInclude.length === 0) return;

    const rawText = wordsToInclude.join(" ");
    const header = `[Document: ${filename} | Dept: ${departmentName} | Date: ${date} | Section: ${sectionName}]`;
    const fullContent = `${header}\n\n${rawText}`;

    chunks.push({
      index: chunkIndex++,
      content: fullContent,
      rawText,
      header,
      section: sectionName,
      tokenCount: estimateTokens(fullContent),
    });
  };

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const lines = trimmed.split(/\r?\n/);
    if (lines.length > 0 && isHeading(lines[0])) {
      currentSection = lines[0].replace(/^#{1,6}\s+/, "").trim();
    }

    const paraWords = trimmed.split(/\s+/).filter(Boolean);
    const paraTokens = Math.ceil(paraWords.length * 1.3);

    // If adding this paragraph exceeds maxTokens, flush current buffer
    if (currentWords.length > 0 && Math.ceil((currentWords.length + paraWords.length) * 1.3) > maxTokens) {
      flushChunk(currentWords, currentSection);

      // Slide overlap (approx 200 tokens -> ~150 words)
      const overlapWordsCount = Math.floor(overlapTokens / 1.3);
      const overlap = currentWords.slice(-overlapWordsCount);
      currentWords = [...overlap, ...paraWords];
    } else {
      currentWords.push(...paraWords);
    }

    // If single paragraph is giant (> maxTokens), break it down
    while (Math.ceil(currentWords.length * 1.3) > maxTokens) {
      const sliceCount = Math.floor(maxTokens / 1.3);
      const chunkWords = currentWords.slice(0, sliceCount);
      flushChunk(chunkWords, currentSection);

      const overlapWordsCount = Math.floor(overlapTokens / 1.3);
      currentWords = currentWords.slice(sliceCount - overlapWordsCount);
    }
  }

  if (currentWords.length > 0) {
    flushChunk(currentWords, currentSection);
  }

  return chunks;
}
