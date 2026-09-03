CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY,
	"object_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"content_type" varchar(127) NOT NULL,
	"expected_size" bigint NOT NULL,
	"actual_size" bigint,
	"etag" text,
	"status" varchar(16) DEFAULT 'PENDING' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uploads_object_key_unique" ON "uploads" ("object_key");