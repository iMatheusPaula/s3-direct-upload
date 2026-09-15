import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { uploadsRoutes } from "@/modules/uploads/uploads.routes";

const api = new Hono()
  .get("/", (c) => c.json({ status: "ok" }))
  .route("/uploads", uploadsRoutes);

const app = new Hono();

app.route("/v1", api);

app.use("/*", serveStatic({ root: "./public" }));

app.notFound((c) => c.json({ error: "Not Found" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export type AppType = typeof api;

export default {
  fetch: app.fetch,
  maxRequestBodySize: 10 * 1024 * 1024,
};
