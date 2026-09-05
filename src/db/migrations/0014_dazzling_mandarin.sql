CREATE TYPE "public"."publication_operation" AS ENUM('create', 'update');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."publication_target" AS ENUM('timbenniksdev-2024', 'timbenniks-2026');--> statement-breakpoint
CREATE TABLE "publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"published_article_version_id" uuid NOT NULL,
	"target" "publication_target" NOT NULL,
	"operation" "publication_operation" NOT NULL,
	"status" "publication_status" DEFAULT 'pending' NOT NULL,
	"repository" text NOT NULL,
	"path" text NOT NULL,
	"branch" text NOT NULL,
	"variant_revision" integer NOT NULL,
	"markdown_snapshot" text NOT NULL,
	"content_hash" text NOT NULL,
	"expected_blob_sha" text,
	"commit_sha" text,
	"blob_sha" text,
	"external_url" text,
	"request_metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result_metadata_json" jsonb,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "publications_positive_variant_revision" CHECK ("publications"."variant_revision" > 0),
	CONSTRAINT "publications_content_hash_shape" CHECK ("publications"."content_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "publications_expected_blob_sha_shape" CHECK ("publications"."expected_blob_sha" is null or "publications"."expected_blob_sha" ~ '^[a-f0-9]{40}$'),
	CONSTRAINT "publications_commit_sha_shape" CHECK ("publications"."commit_sha" is null or "publications"."commit_sha" ~ '^[a-f0-9]{40}$'),
	CONSTRAINT "publications_blob_sha_shape" CHECK ("publications"."blob_sha" is null or "publications"."blob_sha" ~ '^[a-f0-9]{40}$'),
	CONSTRAINT "publications_operation_sha_consistency" CHECK (("publications"."operation" = 'create' and "publications"."expected_blob_sha" is null) or ("publications"."operation" = 'update' and "publications"."expected_blob_sha" is not null)),
	CONSTRAINT "publications_result_consistency" CHECK (
      ("publications"."status" = 'pending' and "publications"."commit_sha" is null and "publications"."blob_sha" is null and "publications"."external_url" is null and "publications"."error_code" is null and "publications"."completed_at" is null)
      or ("publications"."status" = 'succeeded' and "publications"."commit_sha" is not null and "publications"."blob_sha" is not null and "publications"."external_url" is not null and "publications"."error_code" is null and "publications"."completed_at" is not null)
      or ("publications"."status" = 'failed' and "publications"."commit_sha" is null and "publications"."blob_sha" is null and "publications"."external_url" is null and "publications"."error_code" is not null and "publications"."completed_at" is not null)
    )
);
--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_variant_id_publication_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."publication_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_published_article_version_id_article_versions_id_fk" FOREIGN KEY ("published_article_version_id") REFERENCES "public"."article_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "publications_variant_target_created_idx" ON "publications" USING btree ("variant_id","target","created_at");--> statement-breakpoint
CREATE INDEX "publications_user_created_idx" ON "publications" USING btree ("user_id","created_at");