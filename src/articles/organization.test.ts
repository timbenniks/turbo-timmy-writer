import { describe, expect, it } from "vitest";

import {
  canonicalizeTagLabels,
  createCheckpointInputSchema,
  normalizeTagName,
  parseTagDraft,
  updateArticleStatusInputSchema,
} from "./organization";

describe("article organization", () => {
  it("normalizes tags while preserving the first display label", () => {
    expect(normalizeTagName("  Web   Performance ")).toBe("web performance");
    expect(
      canonicalizeTagLabels(["Web Performance", " web  performance ", "Next.js"]),
    ).toEqual([
      { normalizedName: "next.js", label: "Next.js" },
      { normalizedName: "web performance", label: "Web Performance" },
    ]);
    expect(parseTagDraft("AI, DX, ai")).toEqual(["AI", "DX"]);
  });

  it("validates status and checkpoint mutation boundaries", () => {
    const articleId = "5b0f8636-fdeb-45f3-8a44-ddd326bea5c8";
    expect(
      updateArticleStatusInputSchema.safeParse({
        articleId,
        expectedStatus: "drafting",
        nextStatus: "editing",
      }).success,
    ).toBe(true);
    expect(
      createCheckpointInputSchema.safeParse({
        articleId,
        expectedRevision: 3,
        label: "Before restructuring",
      }).success,
    ).toBe(true);
    expect(
      createCheckpointInputSchema.safeParse({ articleId, expectedRevision: 0 }).success,
    ).toBe(false);
  });
});
