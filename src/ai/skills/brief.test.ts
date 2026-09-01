import { describe, expect, it } from "vitest";

import { createPremiseBrief } from "@/ai/brief/model";

import { briefUpdateSkill } from "./brief";

describe("article brief update skill", () => {
  it("requires evidence and preserves uncertainty", () => {
    const instructions = briefUpdateSkill.buildInstructions({
      currentBrief: createPremiseBrief("A premise"),
      messages: [
        { role: "user", text: "A premise" },
        { role: "assistant", text: "What happened?" },
      ],
    });

    expect(instructions).toContain("supported by Tim's words");
    expect(instructions).toContain("Do not invent facts");
    expect(instructions).toContain("preserving meaningful tension and uncertainty");
    expect(briefUpdateSkill.outputSchema).toBeDefined();
  });
});
