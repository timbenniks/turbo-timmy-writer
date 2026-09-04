import { describe, expect, it } from "vitest";

import { initialArticleVoiceProfile, selectArticleVoiceGuidance } from "./article-profile";

describe("initial article voice profile", () => {
  it("keeps evidence separate from bounded runtime guidance", () => {
    const guidance = selectArticleVoiceGuidance();

    expect(initialArticleVoiceProfile.evidenceSummary.sourceFiles).toHaveLength(2);
    expect(guidance.profileVersion).toBe(1);
    expect(guidance.observations.length).toBeLessThanOrEqual(12);
    expect(guidance.observations[0]).not.toHaveProperty("evidence");
  });

  it("treats observed structure as evidence instead of a mandatory formula", () => {
    const guidance = selectArticleVoiceGuidance();
    const structure = guidance.observations.find(({ id }) => id === "flexible-article-shape");

    expect(structure?.guidance).toContain("Do not impose a fixed section formula");
    expect(structure?.confidence).toBe("medium");
  });
});
