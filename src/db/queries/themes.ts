import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, isNull, or } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { themes, userThemePreferences } from "@/db/schema";
import {
  duplicateThemeName,
  themeSettingsSchema,
  type ThemeSettings,
  type WritingTheme,
} from "@/themes/model";

function toWritingTheme(row: {
  id: string;
  name: string;
  settings: unknown;
  isBuiltin: boolean;
  isFavorite: boolean | null;
  isDefault: boolean | null;
}): WritingTheme | null {
  const settings = themeSettingsSchema.safeParse(row.settings);
  if (!settings.success) return null;
  return {
    id: row.id,
    name: row.name,
    settings: settings.data,
    isBuiltin: row.isBuiltin,
    isFavorite: row.isFavorite ?? false,
    isDefault: row.isDefault ?? false,
  };
}

export async function listThemesForUser(userId: string) {
  const rows = await getDatabase()
    .select({
      id: themes.id,
      name: themes.name,
      settings: themes.settingsJson,
      isBuiltin: themes.isBuiltin,
      isFavorite: userThemePreferences.isFavorite,
      isDefault: userThemePreferences.isDefault,
    })
    .from(themes)
    .leftJoin(
      userThemePreferences,
      and(
        eq(userThemePreferences.themeId, themes.id),
        eq(userThemePreferences.userId, userId),
      ),
    )
    .where(or(isNull(themes.userId), eq(themes.userId, userId)))
    .orderBy(
      desc(userThemePreferences.isFavorite),
      desc(themes.isBuiltin),
      asc(themes.name),
    );

  return rows.map(toWritingTheme).filter((theme): theme is WritingTheme => Boolean(theme));
}

async function getAccessibleTheme(themeId: string, userId: string) {
  const [theme] = await getDatabase()
    .select()
    .from(themes)
    .where(
      and(
        eq(themes.id, themeId),
        or(isNull(themes.userId), eq(themes.userId, userId)),
      ),
    )
    .limit(1);
  return theme ?? null;
}

export async function duplicateThemeForUser(themeId: string, userId: string) {
  const source = await getAccessibleTheme(themeId, userId);
  if (!source) return null;
  const [created] = await getDatabase()
    .insert(themes)
    .values({
      id: randomUUID(),
      userId,
      name: duplicateThemeName(source.name),
      settingsJson: source.settingsJson,
    })
    .returning();
  return created ?? null;
}

export async function updateThemeForUser(input: {
  themeId: string;
  userId: string;
  name: string;
  settings: ThemeSettings;
}) {
  const [updated] = await getDatabase()
    .update(themes)
    .set({ name: input.name, settingsJson: input.settings, updatedAt: new Date() })
    .where(
      and(
        eq(themes.id, input.themeId),
        eq(themes.userId, input.userId),
        eq(themes.isBuiltin, false),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function deleteThemeForUser(themeId: string, userId: string) {
  const [deleted] = await getDatabase()
    .delete(themes)
    .where(
      and(
        eq(themes.id, themeId),
        eq(themes.userId, userId),
        eq(themes.isBuiltin, false),
      ),
    )
    .returning({ id: themes.id });
  return Boolean(deleted);
}

export async function setDefaultThemeForUser(themeId: string, userId: string) {
  if (!(await getAccessibleTheme(themeId, userId))) return false;
  const database = getDatabase();
  await database.batch([
    database
      .update(userThemePreferences)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(userThemePreferences.userId, userId)),
    database
      .insert(userThemePreferences)
      .values({ userId, themeId, isDefault: true })
      .onConflictDoUpdate({
        target: [userThemePreferences.userId, userThemePreferences.themeId],
        set: { isDefault: true, updatedAt: new Date() },
      }),
  ]);
  return true;
}

export async function toggleFavoriteThemeForUser(themeId: string, userId: string) {
  if (!(await getAccessibleTheme(themeId, userId))) return null;
  const database = getDatabase();
  const [preference] = await database
    .select({ isFavorite: userThemePreferences.isFavorite })
    .from(userThemePreferences)
    .where(
      and(
        eq(userThemePreferences.userId, userId),
        eq(userThemePreferences.themeId, themeId),
      ),
    )
    .limit(1);
  const isFavorite = !(preference?.isFavorite ?? false);
  await database
    .insert(userThemePreferences)
    .values({ userId, themeId, isFavorite })
    .onConflictDoUpdate({
      target: [userThemePreferences.userId, userThemePreferences.themeId],
      set: { isFavorite, updatedAt: new Date() },
    });
  return isFavorite;
}
