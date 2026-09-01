CREATE TYPE "public"."writing_message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."writing_session_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."writing_session_type" AS ENUM('article-start');--> statement-breakpoint
CREATE TABLE "writing_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "writing_message_role" NOT NULL,
	"content_json" jsonb NOT NULL,
	"plain_text" text NOT NULL,
	"ai_run_id" uuid,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"type" "writing_session_type" NOT NULL,
	"status" "writing_session_status" DEFAULT 'active' NOT NULL,
	"next_sequence" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "writing_messages" ADD CONSTRAINT "writing_messages_session_id_writing_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."writing_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_messages" ADD CONSTRAINT "writing_messages_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("ai_run_id") REFERENCES "public"."ai_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_sessions" ADD CONSTRAINT "writing_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_sessions" ADD CONSTRAINT "writing_sessions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "writing_messages_session_sequence_unique" ON "writing_messages" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE INDEX "writing_messages_session_created_idx" ON "writing_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "writing_sessions_article_type_unique" ON "writing_sessions" USING btree ("article_id","type");--> statement-breakpoint
CREATE INDEX "writing_sessions_user_updated_idx" ON "writing_sessions" USING btree ("user_id","updated_at");