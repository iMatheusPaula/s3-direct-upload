import { Hono } from "hono";
import { uploadsRoutes } from "@/modules/uploads/uploads.routes";

const app = new Hono().basePath("/v1");

app.get("/", (c) => c.json({ status: "ok" }));
app.route("/uploads", uploadsRoutes);

app.notFound((c) => c.json({ error: "Not Found" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default {
  fetch: app.fetch,
  maxRequestBodySize: 10 * 1024 * 1024,
};
