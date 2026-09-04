CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "archive_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"archive_document_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"body_text" text NOT NULL,
	"token_count" integer NOT NULL,
	"embedding" vector(1024),
	"embedding_model" text,
	"embedding_dimensions" integer,
	"content_hash" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"embedded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "archive_chunks_ordinal_check" CHECK ("archive_chunks"."ordinal" >= 0),
	CONSTRAINT "archive_chunks_token_count_check" CHECK ("archive_chunks"."token_count" > 0),
	CONSTRAINT "archive_chunks_embedding_metadata_check" CHECK ((
        ("archive_chunks"."embedding" is null and "archive_chunks"."embedding_model" is null and "archive_chunks"."embedding_dimensions" is null and "archive_chunks"."embedded_at" is null)
        or
        ("archive_chunks"."embedding" is not null and "archive_chunks"."embedding_model" is not null and "archive_chunks"."embedding_dimensions" = 1024 and "archive_chunks"."embedded_at" is not null)
      ))
);
--> statement-breakpoint
ALTER TABLE "archive_chunks" ADD CONSTRAINT "archive_chunks_archive_document_id_archive_documents_id_fk" FOREIGN KEY ("archive_document_id") REFERENCES "public"."archive_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "archive_chunks_document_ordinal_unique" ON "archive_chunks" USING btree ("archive_document_id","ordinal");--> statement-breakpoint
CREATE INDEX "archive_chunks_document_idx" ON "archive_chunks" USING btree ("archive_document_id");--> statement-breakpoint
CREATE INDEX "archive_chunks_content_hash_idx" ON "archive_chunks" USING btree ("content_hash");
