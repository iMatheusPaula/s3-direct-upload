import { extname } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

  return {
    id,
    objectKey,
    uploadUrl,
    expiresIn: URL_TTL_SECONDS,
  };
}
