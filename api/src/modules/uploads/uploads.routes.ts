import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { presignBodySchema } from "./uploads.schema";
import { createPresignedUpload } from "./uploads.service";

export const uploadsRoutes = new Hono().post(
  "/presign",
  zValidator("json", presignBodySchema),
  async (c) => {
    const upload = await createPresignedUpload(c.req.valid("json"));
    return c.json(upload, 201);
  },
);
