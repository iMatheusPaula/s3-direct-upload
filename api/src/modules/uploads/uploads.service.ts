import { extname } from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { uploads } from "@/db/schema";
import type { PresignBody } from "./uploads.schema";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET;

if (!BUCKET) {
  throw new Error("S3_BUCKET não configurado");
}

const URL_TTL_SECONDS = 15 * 60;

function safeExtension(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : "";
}

function urlDecode(str: string): string {
  return decodeURIComponent(str.replace(/\+/g, " "));
}

export async function createPresignedUpload(input: PresignBody) {
  const id = Bun.randomUUIDv7();
  const objectKey = `uploads/${id}${safeExtension(input.filename)}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
    ContentType: input.contentType,
    ContentLength: input.size,
    Metadata: { "original-filename": encodeURIComponent(input.filename) },
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: URL_TTL_SECONDS,
    signableHeaders: new Set(["content-type"]),
  });

  await db.insert(uploads).values({
    id,
    objectKey,
    originalFilename: input.filename,
    contentType: input.contentType,
    expectedSize: input.size,
  });

  return {
    id,
    objectKey,
    uploadUrl,
    expiresIn: URL_TTL_SECONDS,
  };
}

export async function getUpload(id: string) {
  const [row] = await db
    .select()
    .from(uploads)
    .where(eq(uploads.id, id))
    .limit(1);

  if (!row) {
    // todo voltar objeto vazio em vez de null e 404.
    return null;
  }

  const downloadUrl =
    row.status === "COMPLETED"
      ? await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: BUCKET, Key: row.objectKey }),
          { expiresIn: URL_TTL_SECONDS },
        )
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

export async function confirmUpload(body: string): Promise<void> {
  const { Records } = JSON.parse(body);

  if (!Array.isArray(Records)) {
    return;
  }

  for (const record of Records) {
    const object = record.s3?.object;

    if (!object?.key) {
      continue;
    }

    const objectKey = urlDecode(object.key);

    const [updated] = await db
      .update(uploads)
      .set({
        status: "COMPLETED",
        actualSize: object.size ?? null,
        etag: object.eTag ?? null,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(uploads.objectKey, objectKey),
          eq(uploads.status, "PENDING")
        ),
      )
      .returning({ id: uploads.id });

    console.log(updated ? `COMPLETED ${objectKey}` : `ignorado ${objectKey}`);
  }
}
