CREATE TYPE "public"."article_status" AS ENUM('idea', 'interviewing', 'drafting', 'editing', 'ready', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"status" "article_status" NOT NULL,
	"document_json" jsonb NOT NULL,
	"plain_text" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_user_slug_unique" ON "articles" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "articles_user_status_updated_idx" ON "articles" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "articles_user_updated_idx" ON "articles" USING btree ("user_id","updated_at");