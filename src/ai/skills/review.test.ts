import { describe, expect, it } from "vitest";

import { humanizerCatalogV1 } from "@/ai/review/model";
import { criticSkill } from "@/ai/skills/critic";
import { humanizerSkill } from "@/ai/skills/humanizer";

const input = { title: "Title", plainText: "A complete article.", sourceRevision: 4 };

describe("precision review skills", () => {
  it("uses a stable, uniquely identified humanizer catalog", () => {
    expect(humanizerCatalogV1.length).toBeGreaterThan(8);
    expect(new Set(humanizerCatalogV1.map((pattern) => pattern.id)).size).toBe(humanizerCatalogV1.length);
    expect(humanizerSkill.version).toBe("v1");
    expect(humanizerSkill.buildInstructions(input)).toContain("Detect only; do not rewrite");
  });

  it("makes the critic read-only and comprehensive", () => {
    const instructions = criticSkill.buildInstructions(input);
    expect(instructions).toContain("do not edit or rewrite");
    expect(instructions).toContain("contradictions");
    expect(instructions).toContain("opening");
    expect(instructions).toContain("evidence");
  });
});
