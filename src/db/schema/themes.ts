import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { ThemeSettings } from "@/themes/model";

import { users } from "./users";

export const themes = pgTable(
  "themes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    settingsJson: jsonb("settings_json").$type<ThemeSettings>().notNull(),
    isBuiltin: boolean("is_builtin").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("themes_user_updated_idx").on(table.userId, table.updatedAt),
    uniqueIndex("themes_builtin_name_unique")
      .on(table.name)
      .where(sql`${table.isBuiltin} = true`),
  ],
);

export const userThemePreferences = pgTable(
  "user_theme_preferences",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    themeId: uuid("theme_id").notNull().references(() => themes.id, { onDelete: "cascade" }),
    isFavorite: boolean("is_favorite").default(false).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.themeId] }),
    uniqueIndex("user_theme_preferences_one_default")
      .on(table.userId)
      .where(sql`${table.isDefault} = true`),
  ],
);

export type Theme = typeof themes.$inferSelect;
