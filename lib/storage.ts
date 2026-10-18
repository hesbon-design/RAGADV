import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface StoredFileMetadata {
  storagePath: string;
  fileHash: string;
  fileSize: number;
}

const storageDir = path.join(process.cwd(), "data", "storage");

export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function saveFile(
  buffer: Buffer,
  filename: string,
  reportId: string
): Promise<StoredFileMetadata> {
  const fileHash = computeFileHash(buffer);
  const targetDir = path.join(storageDir, reportId);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Sanitize filename to prevent directory traversal
  const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const fullPath = path.join(targetDir, safeFilename);

  await fs.promises.writeFile(fullPath, buffer);

  return {
    storagePath: fullPath,
    fileHash,
    fileSize: buffer.length,
  };
}

export async function readStoredFile(storagePath: string): Promise<Buffer> {
  return fs.promises.readFile(storagePath);
}
