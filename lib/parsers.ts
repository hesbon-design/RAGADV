import { extractText } from "unpdf";
import mammoth from "mammoth";

export interface ExtractedDocument {
  text: string;
  pageCount: number;
  charCount: number;
  isScanned: boolean;
}

export async function parseDocument(
  buffer: Buffer,
  filename: string
): Promise<ExtractedDocument> {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    return parsePdf(buffer);
  } else if (ext === "docx") {
    return parseDocx(buffer);
  } else if (ext === "txt" || ext === "md" || ext === "csv") {
    return parseText(buffer);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Only PDF, DOCX, TXT, and MD are supported.`);
  }
}

async function parsePdf(buffer: Buffer): Promise<ExtractedDocument> {
  // unpdf expects an ArrayBuffer or Uint8Array
  const uint8Array = new Uint8Array(buffer);
  const result = await extractText(uint8Array, { mergePages: true });

  const rawText = Array.isArray(result.text) ? result.text.join("\n\n") : result.text || "";
  const cleanedText = rawText.trim();
  const charCount = cleanedText.length;
  const isScanned = charCount < 50;

  return {
    text: cleanedText,
    pageCount: result.totalPages || 1,
    charCount,
    isScanned,
  };
}

async function parseDocx(buffer: Buffer): Promise<ExtractedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  const cleanedText = (result.value || "").trim();
  const charCount = cleanedText.length;
  // Estimate page count for docx (approx 450 words per page)
  const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 450));

  return {
    text: cleanedText,
    pageCount,
    charCount,
    isScanned: charCount < 50,
  };
}

function parseText(buffer: Buffer): Promise<ExtractedDocument> {
  const cleanedText = buffer.toString("utf-8").trim();
  const charCount = cleanedText.length;
  const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 500));

  return Promise.resolve({
    text: cleanedText,
    pageCount,
    charCount,
    isScanned: charCount < 10,
  });
}
