import {
  bigint,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export type UploadStatus = "PENDING" | "COMPLETED" | "FAILED";

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => Bun.randomUUIDv7())
      .notNull(),
    objectKey: text("object_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    contentType: varchar("content_type", { length: 127 }).notNull(),
    expectedSize: bigint("expected_size", { mode: "number" }).notNull(),
    actualSize: bigint("actual_size", { mode: "number" }),
    etag: text("etag"),
    status: varchar("status", { length: 16 })
      .$type<UploadStatus>()
      .default("PENDING")
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("uploads_object_key_unique").on(t.objectKey)],
);

export type Upload = typeof uploads.$inferSelect;
export type NewUpload = typeof uploads.$inferInsert;
