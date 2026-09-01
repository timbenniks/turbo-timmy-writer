CREATE TYPE "public"."ai_run_status" AS ENUM('running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"article_id" uuid,
	"skill_id" text NOT NULL,
	"skill_version" text NOT NULL,
	"model" text NOT NULL,
	"status" "ai_run_status" DEFAULT 'running' NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"duration_ms" integer,
	"outcome_json" jsonb,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_runs_user_created_idx" ON "ai_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_runs_article_created_idx" ON "ai_runs" USING btree ("article_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_runs_skill_created_idx" ON "ai_runs" USING btree ("skill_id","created_at");