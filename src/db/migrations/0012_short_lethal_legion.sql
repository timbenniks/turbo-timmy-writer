CREATE TYPE "public"."writing_profile_status" AS ENUM('draft', 'active', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."writing_profile_type" AS ENUM('article');--> statement-breakpoint
CREATE TABLE "writing_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_type" "writing_profile_type" NOT NULL,
	"profile_version" integer NOT NULL,
	"observations_json" jsonb NOT NULL,
	"evidence_summary_json" jsonb NOT NULL,
	"analysis_window_start" timestamp with time zone,
	"analysis_window_end" timestamp with time zone,
	"source_count" integer NOT NULL,
	"status" "writing_profile_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "writing_profiles_positive_version" CHECK ("writing_profiles"."profile_version" > 0),
	CONSTRAINT "writing_profiles_positive_source_count" CHECK ("writing_profiles"."source_count" > 0),
	CONSTRAINT "writing_profiles_valid_analysis_window" CHECK ("writing_profiles"."analysis_window_start" is null or "writing_profiles"."analysis_window_end" is null or "writing_profiles"."analysis_window_start" <= "writing_profiles"."analysis_window_end")
);
--> statement-breakpoint
ALTER TABLE "writing_profiles" ADD CONSTRAINT "writing_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "writing_profiles_user_type_version_unique" ON "writing_profiles" USING btree ("user_id","profile_type","profile_version");--> statement-breakpoint
CREATE UNIQUE INDEX "writing_profiles_one_active_per_type" ON "writing_profiles" USING btree ("user_id","profile_type") WHERE "writing_profiles"."status" = 'active';--> statement-breakpoint
CREATE INDEX "writing_profiles_user_updated_idx" ON "writing_profiles" USING btree ("user_id","updated_at");