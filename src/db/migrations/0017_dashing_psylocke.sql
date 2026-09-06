CREATE TYPE "public"."delivery_operation" AS ENUM('create-draft', 'publish');--> statement-breakpoint
CREATE TYPE "public"."delivery_provider" AS ENUM('buttondown', 'contentstack', 'linkedin');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"source_article_version_id" uuid NOT NULL,
	"provider" "delivery_provider" NOT NULL,
	"operation" "delivery_operation" NOT NULL,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"variant_revision" integer NOT NULL,
	"snapshot_json" jsonb NOT NULL,
	"snapshot_hash" text NOT NULL,
	"external_id" text,
	"external_url" text,
	"request_metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result_metadata_json" jsonb,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "deliveries_positive_variant_revision" CHECK ("deliveries"."variant_revision" > 0),
	CONSTRAINT "deliveries_snapshot_hash_shape" CHECK ("deliveries"."snapshot_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "deliveries_result_consistency" CHECK (
      ("deliveries"."status" = 'pending' and "deliveries"."external_id" is null and "deliveries"."external_url" is null and "deliveries"."error_code" is null and "deliveries"."completed_at" is null)
      or ("deliveries"."status" = 'succeeded' and "deliveries"."external_id" is not null and "deliveries"."error_code" is null and "deliveries"."completed_at" is not null)
      or ("deliveries"."status" = 'failed' and "deliveries"."external_id" is null and "deliveries"."external_url" is null and "deliveries"."error_code" is not null and "deliveries"."completed_at" is not null)
    )
);
--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_variant_id_publication_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."publication_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_source_article_version_id_article_versions_id_fk" FOREIGN KEY ("source_article_version_id") REFERENCES "public"."article_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deliveries_variant_provider_created_idx" ON "deliveries" USING btree ("variant_id","provider","created_at");--> statement-breakpoint
CREATE INDEX "deliveries_user_created_idx" ON "deliveries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_one_pending_provider_unique" ON "deliveries" USING btree ("variant_id","provider") WHERE "deliveries"."status" = 'pending';