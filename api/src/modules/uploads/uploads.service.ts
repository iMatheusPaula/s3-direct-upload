import { extname } from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { uploads } from "@/db/schema";
import { generateDownloadUrl, generateUploadUrl } from "./integrations/s3";
import type { PresignBody } from "./uploads.schema";

const URL_TTL_SECONDS = 15 * 60;

function safeExtension(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : "";
}

export async function createPresignedUpload(input: PresignBody) {
  const id = Bun.randomUUIDv7();
  const objectKey = `uploads/${id}${safeExtension(input.filename)}`;

  const uploadUrl = await generateUploadUrl({
    objectKey,
    filename: input.filename,
    contentType: input.contentType,
    size: input.size,
    expiresIn: URL_TTL_SECONDS,
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
      ? await generateDownloadUrl({
          objectKey: row.objectKey,
          expiresIn: URL_TTL_SECONDS,
        })
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
