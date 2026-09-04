import { describe, expect, it } from "vitest";

import { selectArticleVoiceGuidance } from "@/ai/voice/article-profile";
import { getDestinationProfile } from "@/variants/destinations";
import { repurposeSkill, repurposeSkillFor, validateRepurposeDestination } from "./repurpose";

describe("repurpose skill", () => {
  it("includes only the requested versioned destination rules", () => {
    const input = {
      canonicalTitle: "A useful title",
      canonicalMarkdown: "A useful argument.",
      destinationProfile: getDestinationProfile("linkedin-post"),
      voiceGuidance: selectArticleVoiceGuidance(),
    };
    const instructions = repurposeSkill.buildInstructions(input);

    expect(instructions).toContain("LinkedIn post");
    expect(instructions).toContain("3,000 characters");
    expect(instructions).not.toContain("subject and preview text");
  });

  it("rejects output for a different destination", () => {
    expect(() => validateRepurposeDestination("linkedin-post", {
      content: { version: 1, destination: "website", bodyMarkdown: "Body" },
      metadata: {
        version: 1,
        destination: "website",
        title: "Title",
        slug: "title",
        description: "Description",
        canonicalUrl: null,
      },
    })).toThrow("did not match");
  });

  it("uses an exact structured schema for the requested destination", () => {
    const schema = repurposeSkillFor("linkedin-post").outputSchema;
    expect(schema?.safeParse({
      content: { version: 1, destination: "linkedin-post", bodyMarkdown: "Post" },
      metadata: { version: 1, destination: "linkedin-post", publicationUrl: null },
    }).success).toBe(true);
    expect(schema?.safeParse({
      content: { version: 1, destination: "website", bodyMarkdown: "Post" },
      metadata: {
        version: 1,
        destination: "website",
        title: "Title",
        slug: "title",
        description: "",
        canonicalUrl: null,
      },
    }).success).toBe(false);
  });
});
