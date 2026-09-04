import { describe, expect, it } from "vitest";

import { editorSuggestionRequestSchema } from "@/ai/editor/model";
import { editorSkill } from "@/ai/skills/editor";

describe("editorSkill", () => {
  it("keeps transformations bounded and reviewable", () => {
    const instructions = editorSkill.buildInstructions({
      actionId: "tighten",
      instruction: null,
      originalText: "In order to ship, we need to test.",
      before: "Before.",
      after: "After.",
    });
    expect(instructions).toContain("Edit only the selected passage");
    expect(instructions).toContain("Do not invent");
    expect(instructions).toContain("Remove filler");
  });

  it("requires an instruction for custom requests", () => {
    const base = {
      actionId: "custom" as const,
      instruction: null,
      selection: {
        documentVersion: 1 as const,
        sourceRevision: 2,
        originalText: "Selected",
        bookmark: { from: 1, to: 9, anchor: 1, head: 9 },
      },
    };
    expect(editorSuggestionRequestSchema.safeParse(base).success).toBe(false);
    expect(editorSuggestionRequestSchema.safeParse({ ...base, instruction: "Make this warmer" }).success).toBe(true);
  });
});
