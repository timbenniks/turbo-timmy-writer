import { describe, expect, it } from "vitest";

import { duplicateThemeName, themeSettingsSchema } from "./model";

const validSettings = {
  version: 1 as const,
  editor: { fontFamily: "serif" as const, fontSize: 21, lineHeight: 1.7, maxWidth: 800 },
  appearance: {
    background: "#fffefa",
    foreground: "#24231f",
    muted: "#817d73",
    accent: "#79634f",
    selection: "#d9c9b8",
  },
  chrome: { density: "comfortable" as const, sidebar: "visible" as const },
};

describe("writing themes", () => {
  it("accepts bounded versioned theme settings", () => {
    expect(themeSettingsSchema.parse(validSettings)).toEqual(validSettings);
  });

  it("rejects unsafe colours and out-of-range editor widths", () => {
    expect(themeSettingsSchema.safeParse({
      ...validSettings,
      editor: { ...validSettings.editor, maxWidth: 1200 },
      appearance: { ...validSettings.appearance, accent: "red" },
    }).success).toBe(false);
  });

  it("creates a bounded duplicate name", () => {
    expect(duplicateThemeName("Quiet")).toBe("Quiet copy");
    expect(duplicateThemeName("x".repeat(80))).toHaveLength(60);
  });
});
