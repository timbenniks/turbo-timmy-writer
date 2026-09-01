CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"settings_json" jsonb NOT NULL,
	"is_builtin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_theme_preferences" (
	"user_id" uuid NOT NULL,
	"theme_id" uuid NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_theme_preferences_user_id_theme_id_pk" PRIMARY KEY("user_id","theme_id")
);
--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_theme_preferences" ADD CONSTRAINT "user_theme_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_theme_preferences" ADD CONSTRAINT "user_theme_preferences_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "themes_user_updated_idx" ON "themes" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "themes_builtin_name_unique" ON "themes" USING btree ("name") WHERE "themes"."is_builtin" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "user_theme_preferences_one_default" ON "user_theme_preferences" USING btree ("user_id") WHERE "user_theme_preferences"."is_default" = true;
--> statement-breakpoint
INSERT INTO "themes" ("id", "name", "settings_json", "is_builtin") VALUES
('10000000-0000-4000-8000-000000000001', 'Quiet', '{"version":1,"editor":{"fontFamily":"serif","fontSize":21,"lineHeight":1.72,"maxWidth":800},"appearance":{"background":"#fffefa","foreground":"#24231f","muted":"#817d73","accent":"#79634f","selection":"#d9c9b8"},"chrome":{"density":"comfortable","sidebar":"visible"}}'::jsonb, true),
('10000000-0000-4000-8000-000000000002', 'Paper', '{"version":1,"editor":{"fontFamily":"serif","fontSize":22,"lineHeight":1.78,"maxWidth":760},"appearance":{"background":"#f7f1e3","foreground":"#29251f","muted":"#786f64","accent":"#b35c35","selection":"#e7c7a4"},"chrome":{"density":"comfortable","sidebar":"visible"}}'::jsonb, true),
('10000000-0000-4000-8000-000000000003', 'Night', '{"version":1,"editor":{"fontFamily":"serif","fontSize":21,"lineHeight":1.75,"maxWidth":800},"appearance":{"background":"#171a1f","foreground":"#e8e5de","muted":"#999ca3","accent":"#82aaff","selection":"#354a68"},"chrome":{"density":"comfortable","sidebar":"minimal"}}'::jsonb, true),
('10000000-0000-4000-8000-000000000004', 'Terminal', '{"version":1,"editor":{"fontFamily":"mono","fontSize":18,"lineHeight":1.65,"maxWidth":880},"appearance":{"background":"#0d1117","foreground":"#c9d1d9","muted":"#8b949e","accent":"#39d353","selection":"#264f35"},"chrome":{"density":"compact","sidebar":"hidden"}}'::jsonb, true),
('10000000-0000-4000-8000-000000000005', 'Manuscript', '{"version":1,"editor":{"fontFamily":"serif","fontSize":22,"lineHeight":1.9,"maxWidth":700},"appearance":{"background":"#f1ead8","foreground":"#332d24","muted":"#756b5d","accent":"#8a4f3d","selection":"#dbc5a5"},"chrome":{"density":"comfortable","sidebar":"visible"}}'::jsonb, true);
