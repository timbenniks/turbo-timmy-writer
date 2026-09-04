CREATE TABLE "archive_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"body_text" text NOT NULL,
	"source_markup" text,
	"tags" jsonb NOT NULL,
	"source" text NOT NULL,
	"destination" text NOT NULL,
	"content_hash" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "archive_documents" ADD CONSTRAINT "archive_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "archive_documents_user_source_key_unique" ON "archive_documents" USING btree ("user_id","source","source_key");--> statement-breakpoint
CREATE INDEX "archive_documents_user_published_idx" ON "archive_documents" USING btree ("user_id","published_at");