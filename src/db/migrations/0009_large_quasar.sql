CREATE TYPE "public"."editor_suggestion_status" AS ENUM('pending', 'accepted', 'rejected', 'superseded');--> statement-breakpoint
CREATE TABLE "article_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"ai_run_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"skill_version" text NOT NULL,
	"source_revision" integer NOT NULL,
	"result_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editor_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"ai_run_id" uuid NOT NULL,
	"action_id" text NOT NULL,
	"instruction" text,
	"source_revision" integer NOT NULL,
	"document_version" integer NOT NULL,
	"selection_from" integer NOT NULL,
	"selection_to" integer NOT NULL,
	"selection_anchor" integer NOT NULL,
	"selection_head" integer NOT NULL,
	"original_text" text NOT NULL,
	"suggested_text" text NOT NULL,
	"status" "editor_suggestion_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "article_reviews" ADD CONSTRAINT "article_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_reviews" ADD CONSTRAINT "article_reviews_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_reviews" ADD CONSTRAINT "article_reviews_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("ai_run_id") REFERENCES "public"."ai_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editor_suggestions" ADD CONSTRAINT "editor_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editor_suggestions" ADD CONSTRAINT "editor_suggestions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editor_suggestions" ADD CONSTRAINT "editor_suggestions_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("ai_run_id") REFERENCES "public"."ai_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_reviews_article_created_idx" ON "article_reviews" USING btree ("article_id","created_at");--> statement-breakpoint
CREATE INDEX "article_reviews_user_kind_idx" ON "article_reviews" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "editor_suggestions_article_created_idx" ON "editor_suggestions" USING btree ("article_id","created_at");--> statement-breakpoint
CREATE INDEX "editor_suggestions_user_status_idx" ON "editor_suggestions" USING btree ("user_id","status");