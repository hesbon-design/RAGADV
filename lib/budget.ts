export interface BudgetValidationResult {
  valid: boolean;
  estimatedTokens: number;
  wordCount: number;
  error?: {
    code: "PAYLOAD_TOO_LARGE" | "FILE_UNREADABLE_SCANNED";
    message: string;
  };
}

export const MAX_DOCUMENT_TOKENS = 32000;
export const MIN_SELECTABLE_CHARACTERS = 50;

export function validateDocumentBudget(
  text: string,
  filename: string
): BudgetValidationResult {
  const charCount = text.trim().length;

  // 1. Scanned or Corrupt File Guard
  if (charCount < MIN_SELECTABLE_CHARACTERS) {
    return {
      valid: false,
      estimatedTokens: 0,
      wordCount: 0,
      error: {
        code: "FILE_UNREADABLE_SCANNED",
        message: `File "${filename}" contains fewer than ${MIN_SELECTABLE_CHARACTERS} selectable characters. Scanned PDFs without OCR or corrupted files cannot be evaluated.`,
      },
    };
  }

  // 2. Fast Token Estimation: Words * 1.3
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const estimatedTokens = Math.ceil(wordCount * 1.3);

  // 3. Maximum Document Token Ceiling Guard (32k tokens)
  if (estimatedTokens > MAX_DOCUMENT_TOKENS) {
    return {
      valid: false,
      estimatedTokens,
      wordCount,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: `File "${filename}" has ${estimatedTokens.toLocaleString()} estimated tokens, exceeding the single-document ceiling of ${MAX_DOCUMENT_TOKENS.toLocaleString()} tokens.`,
      },
    };
  }

  return {
    valid: true,
    estimatedTokens,
    wordCount,
  };
}
