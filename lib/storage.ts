import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

export interface StoredFileMetadata {
  storagePath: string;
  fileHash: string;
  fileSize: number;
}

const storageDir = path.join(process.cwd(), "data", "storage");

export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function isS3Configured(): boolean {
  const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  return (
    driver === "s3" ||
    driver === "r2" ||
    (Boolean(process.env.S3_BUCKET) && Boolean(process.env.S3_ACCESS_KEY_ID))
  );
}

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    });
  }
  return s3ClientInstance;
}

function parseS3Uri(uri: string): { bucket: string; key: string } {
  const clean = uri.replace(/^s3:\/\//, "");
  const slashIndex = clean.indexOf("/");
  if (slashIndex === -1) {
    return { bucket: clean, key: "" };
  }
  return {
    bucket: clean.slice(0, slashIndex),
    key: clean.slice(slashIndex + 1),
  };
}

export async function saveFile(
  buffer: Buffer,
  filename: string,
  reportId: string
): Promise<StoredFileMetadata> {
  const fileHash = computeFileHash(buffer);
  const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");

  // S3 / Cloudflare R2 Mode
  if (isS3Configured()) {
    const bucket = process.env.S3_BUCKET || "ragadv-reports";
    const key = `reports/${reportId}/${safeFilename}`;
    const s3 = getS3Client();

    let contentType = "application/octet-stream";
    const ext = path.extname(filename).toLowerCase();
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".docx")
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (ext === ".txt" || ext === ".md")
      contentType = "text/plain; charset=utf-8";

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          filehash: fileHash,
          reportid: reportId,
        },
      })
    );

    return {
      storagePath: `s3://${bucket}/${key}`,
      fileHash,
      fileSize: buffer.length,
    };
  }

  // Local Disk Mode
  const targetDir = path.join(storageDir, reportId);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const fullPath = path.join(targetDir, safeFilename);
  await fs.promises.writeFile(fullPath, buffer);

  return {
    storagePath: fullPath,
    fileHash,
    fileSize: buffer.length,
  };
}

export async function fileExists(storagePath: string): Promise<boolean> {
  if (storagePath.startsWith("s3://")) {
    try {
      const { bucket, key } = parseS3Uri(storagePath);
      const s3 = getS3Client();
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  return fs.existsSync(storagePath);
}

export async function readStoredFile(storagePath: string): Promise<Buffer> {
  if (storagePath.startsWith("s3://")) {
    const { bucket, key } = parseS3Uri(storagePath);
    const s3 = getS3Client();
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error(`S3 object body is empty: ${storagePath}`);
    }

    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  return fs.promises.readFile(storagePath);
}
