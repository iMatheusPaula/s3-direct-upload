import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { presignBodySchema, idParamSchema } from "./uploads.schema";
import { createPresignedUpload, getUpload } from "./uploads.service";

export const uploadsRoutes = new Hono()
  .post("/presign", zValidator("json", presignBodySchema), async (c) => {
    const upload = await createPresignedUpload(c.req.valid("json"));
    return c.json(upload, 201);
  })
  .get("/:id", zValidator("param", idParamSchema), async (c) => {
    const upload = await getUpload(c.req.valid("param").id);
    return c.json(upload);
  });
