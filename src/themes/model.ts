import { z } from "zod";

const hexColourSchema = z.string().regex(/^#[0-9a-f]{6}$/i);

export const themeSettingsSchema = z.object({
  version: z.literal(1),
  editor: z.object({
    fontFamily: z.enum(["serif", "sans", "mono"]),
    fontSize: z.number().min(16).max(28),
    lineHeight: z.number().min(1.35).max(2),
    maxWidth: z.number().int().min(560).max(1000),
  }),
  appearance: z.object({
    background: hexColourSchema,
    foreground: hexColourSchema,
    muted: hexColourSchema,
    accent: hexColourSchema,
    selection: hexColourSchema,
  }),
  chrome: z.object({
    density: z.enum(["compact", "comfortable"]),
    sidebar: z.enum(["visible", "minimal", "hidden"]),
  }),
});

export type ThemeSettings = z.infer<typeof themeSettingsSchema>;

export type WritingTheme = {
  id: string;
  name: string;
  settings: ThemeSettings;
  isBuiltin: boolean;
  isFavorite: boolean;
  isDefault: boolean;
};

const themeIdSchema = z.string().uuid();
export const themeNameSchema = z.string().trim().min(1).max(60);

export const duplicateThemeInputSchema = z.object({ themeId: themeIdSchema });
export const updateThemeInputSchema = z.object({
  themeId: themeIdSchema,
  name: themeNameSchema,
  settings: themeSettingsSchema,
});
export const themePreferenceInputSchema = z.object({ themeId: themeIdSchema });

export function duplicateThemeName(name: string) {
  const suffix = " copy";
  return `${name.slice(0, 60 - suffix.length).trimEnd()}${suffix}`;
}
