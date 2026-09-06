CREATE TYPE "public"."source_type" AS ENUM('webpage', 'book', 'paper', 'interview', 'video', 'note', 'other');--> statement-breakpoint
CREATE TABLE "article_sources" (
	"article_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"quote" text,
	"context" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_sources_article_id_source_id_pk" PRIMARY KEY("article_id","source_id"),
	CONSTRAINT "article_sources_position_nonnegative" CHECK ("article_sources"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "source_type" NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"text" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_title_not_blank" CHECK (length(btrim("sources"."title")) > 0),
	CONSTRAINT "sources_url_http_when_present" CHECK ("sources"."url" is null or "sources"."url" ~ '^https?://')
);
--> statement-breakpoint
ALTER TABLE "article_sources" ADD CONSTRAINT "article_sources_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_sources" ADD CONSTRAINT "article_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_sources_article_position_idx" ON "article_sources" USING btree ("article_id","position");--> statement-breakpoint
CREATE INDEX "article_sources_source_idx" ON "article_sources" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "sources_user_updated_idx" ON "sources" USING btree ("user_id","updated_at");
