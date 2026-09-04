CREATE TYPE "public"."variant_destination" AS ENUM('website', 'linkedin-post', 'linkedin-article', 'newsletter');--> statement-breakpoint
CREATE TYPE "public"."variant_status" AS ENUM('draft', 'ready', 'published');--> statement-breakpoint
CREATE TABLE "publication_variant_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"variant_revision" integer NOT NULL,
	"content_json" jsonb NOT NULL,
	"metadata_json" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"has_manual_edits" boolean NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_variant_versions_positive_revision" CHECK ("publication_variant_versions"."variant_revision" > 0),
	CONSTRAINT "publication_variant_versions_hash_shape" CHECK ("publication_variant_versions"."content_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "publication_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"destination" "variant_destination" NOT NULL,
	"content_json" jsonb NOT NULL,
	"metadata_json" jsonb NOT NULL,
	"generated_from_version_id" uuid NOT NULL,
	"generated_by_ai_run_id" uuid,
	"source_article_revision" integer NOT NULL,
	"source_content_hash" text NOT NULL,
	"content_hash" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"has_manual_edits" boolean DEFAULT false NOT NULL,
	"status" "variant_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_variants_positive_source_revision" CHECK ("publication_variants"."source_article_revision" > 0),
	CONSTRAINT "publication_variants_positive_revision" CHECK ("publication_variants"."revision" > 0),
	CONSTRAINT "publication_variants_source_hash_shape" CHECK ("publication_variants"."source_content_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "publication_variants_content_hash_shape" CHECK ("publication_variants"."content_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "publication_variant_versions" ADD CONSTRAINT "publication_variant_versions_variant_id_publication_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."publication_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_variants" ADD CONSTRAINT "publication_variants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_variants" ADD CONSTRAINT "publication_variants_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_variants" ADD CONSTRAINT "publication_variants_generated_from_version_id_article_versions_id_fk" FOREIGN KEY ("generated_from_version_id") REFERENCES "public"."article_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_variants" ADD CONSTRAINT "publication_variants_generated_by_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("generated_by_ai_run_id") REFERENCES "public"."ai_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "publication_variant_versions_revision_unique" ON "publication_variant_versions" USING btree ("variant_id","variant_revision");--> statement-breakpoint
CREATE INDEX "publication_variant_versions_created_idx" ON "publication_variant_versions" USING btree ("variant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "publication_variants_article_destination_unique" ON "publication_variants" USING btree ("article_id","destination");--> statement-breakpoint
CREATE INDEX "publication_variants_user_updated_idx" ON "publication_variants" USING btree ("user_id","updated_at");