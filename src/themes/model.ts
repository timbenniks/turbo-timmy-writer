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

export type ThemeContrastIssue = {
  field: "foreground" | "muted" | "accent" | "selection";
  ratio: number;
  minimum: number;
};

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}

export function colourContrastRatio(first: string, second: string) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export function themeContrastIssues(settings: ThemeSettings): ThemeContrastIssue[] {
  const { background, foreground, muted, accent, selection } = settings.appearance;
  const checks: Array<[ThemeContrastIssue["field"], string, string, number]> = [
    ["foreground", foreground, background, 4.5],
    ["muted", muted, background, 3],
    ["accent", accent, background, 3],
    ["selection", foreground, selection, 4.5],
  ];
  return checks.flatMap(([field, first, second, minimum]) => {
    const ratio = colourContrastRatio(first, second);
    return ratio < minimum ? [{ field, ratio, minimum }] : [];
  });
}

export const accessibleThemeSettingsSchema = themeSettingsSchema.superRefine((settings, context) => {
  for (const issue of themeContrastIssues(settings)) {
    context.addIssue({
      code: "custom",
      path: ["appearance", issue.field],
      message: `Contrast ${issue.ratio}:1 is below ${issue.minimum}:1.`,
    });
  }
});

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
  settings: accessibleThemeSettingsSchema,
});
export const themePreferenceInputSchema = z.object({ themeId: themeIdSchema });

export function duplicateThemeName(name: string) {
  const suffix = " copy";
  return `${name.slice(0, 60 - suffix.length).trimEnd()}${suffix}`;
}
