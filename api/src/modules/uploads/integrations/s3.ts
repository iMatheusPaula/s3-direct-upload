import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type GenerateUploadUrlInput = {
  objectKey: string;
  filename: string;
  contentType: string;
  size: number;
  expiresIn: number;
};

type GenerateDownloadUrlInput = {
  objectKey: string;
  expiresIn: number;
};

let client: S3Client | undefined;

function getS3() {
  const bucket = process.env.S3_BUCKET;

  if (!bucket) {
    throw new Error("S3_BUCKET não configurado");
  }

  client ??= new S3Client({ region: process.env.AWS_REGION });

  return { client, bucket };
}

export function generateUploadUrl({
  objectKey,
  filename,
  contentType,
  size,
  expiresIn,
}: GenerateUploadUrlInput): Promise<string> {
  const { client, bucket } = getS3();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: contentType,
    ContentLength: size,
    Metadata: { "original-filename": encodeURIComponent(filename) },
  });

  return getSignedUrl(client, command, {
    expiresIn,
    signableHeaders: new Set(["content-type"]),
  });
}

export function generateDownloadUrl({
  objectKey,
  expiresIn,
}: GenerateDownloadUrlInput): Promise<string> {
  const { client, bucket } = getS3();

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
    { expiresIn },
  );
}
