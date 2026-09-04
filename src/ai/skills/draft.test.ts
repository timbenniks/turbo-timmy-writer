import { describe, expect, it } from "vitest";

import { createPremiseBrief } from "@/ai/brief/model";
import { selectArticleVoiceGuidance } from "@/ai/voice/article-profile";

import { draftSkill } from "./draft";

describe("first draft skill", () => {
  it("keeps authorship and evidence constraints explicit", () => {
    const instructions = draftSkill.buildInstructions({
      brief: createPremiseBrief("A premise"),
      messages: [{ role: "user", text: "A premise" }],
      archiveEvidence: [],
      voiceGuidance: selectArticleVoiceGuidance(),
    });

    expect(instructions).toContain("Tim remains the author");
    expect(instructions).toContain("do not invent facts");
    expect(instructions).toContain("first line must be exactly one H1 title");
    expect(instructions).toContain("Do not imitate a rigid template");
    expect(instructions).toContain("Archive evidence is optional recall");
    expect(instructions).toContain("Voice guidance is curated");
    expect(draftSkill.version).toBe("v2");
  });
});
