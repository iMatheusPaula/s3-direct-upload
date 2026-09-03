import { z } from "zod";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const presignBodySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(127),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export type PresignBody = z.infer<typeof presignBodySchema>;
