import { extname } from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { uploads } from "@/db/schema";
import type { PresignBody } from "./uploads.schema";

const BUCKET = process.env.S3_BUCKET;

if (!BUCKET) {
  throw new Error("S3_BUCKET não configurado");
}

const s3 = new S3Client({ region: process.env.AWS_REGION });

const URL_TTL_SECONDS = 15 * 60;

function safeExtension(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : "";
}

type UploadUrlInput = {
  objectKey: string;
  filename: string;
  contentType: string;
  size: number;
};

function generateUploadUrl(input: UploadUrlInput): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: input.objectKey,
    ContentType: input.contentType,
    ContentLength: input.size,
    Metadata: { "original-filename": encodeURIComponent(input.filename) },
  });

  return getSignedUrl(s3, command, {
    expiresIn: URL_TTL_SECONDS,
    signableHeaders: new Set(["content-type"]),
  });
}

function generateDownloadUrl(objectKey: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: objectKey }),
    { expiresIn: URL_TTL_SECONDS },
  );
}

export async function createPresignedUpload(input: PresignBody) {
  const id = Bun.randomUUIDv7();
  const objectKey = `uploads/${id}${safeExtension(input.filename)}`;

  const uploadUrl = await generateUploadUrl({
    objectKey,
    filename: input.filename,
    contentType: input.contentType,
    size: input.size,
  });

  await db.insert(uploads).values({
    id,
    objectKey,
    originalFilename: input.filename,
    contentType: input.contentType,
    expectedSize: input.size,
  });

  return { id, objectKey, uploadUrl, expiresIn: URL_TTL_SECONDS };
}

export async function getUpload(id: string) {
  const [row] = await db
    .select()
    .from(uploads)
    .where(eq(uploads.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const downloadUrl =
    row.status === "COMPLETED"
      ? await generateDownloadUrl(row.objectKey)
      : undefined;

  return {
    id: row.id,
    status: row.status,
    originalFilename: row.originalFilename,
    contentType: row.contentType,
    expectedSize: row.expectedSize,
    actualSize: row.actualSize,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    downloadUrl,
  };
}

export type ConfirmUploadInput = {
  objectKey: string;
  actualSize: number | null;
  etag: string | null;
};

export async function confirmUpload({
  objectKey,
  actualSize,
  etag,
}: ConfirmUploadInput): Promise<void> {
  const [updated] = await db
    .update(uploads)
    .set({ status: "COMPLETED", actualSize, etag, completedAt: new Date() })
    .where(and(eq(uploads.objectKey, objectKey), eq(uploads.status, "PENDING")))
    .returning({ id: uploads.id });

  console.log(updated ? `COMPLETED ${objectKey}` : `ignorado ${objectKey}`);
}
