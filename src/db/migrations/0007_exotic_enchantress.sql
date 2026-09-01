CREATE TYPE "public"."article_brief_source" AS ENUM('user', 'ai', 'system');--> statement-breakpoint
CREATE TABLE "article_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"brief_json" jsonb NOT NULL,
	"source" "article_brief_source" NOT NULL,
	"ai_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_briefs" ADD CONSTRAINT "article_briefs_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_briefs" ADD CONSTRAINT "article_briefs_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("ai_run_id") REFERENCES "public"."ai_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "article_briefs_article_revision_unique" ON "article_briefs" USING btree ("article_id","revision");--> statement-breakpoint
CREATE INDEX "article_briefs_article_created_idx" ON "article_briefs" USING btree ("article_id","created_at");