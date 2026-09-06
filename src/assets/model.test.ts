import { describe, expect, it } from "vitest";

import { externalHeroImageSchema, updateArticleHeroImageInputSchema } from "./model";

describe("external hero image", () => {
  it("accepts attributed HTTPS images", () => {
    expect(externalHeroImageSchema.parse({
      url: "https://images.example.com/article.jpg",
      alt: "Tim speaking on stage",
      caption: "A useful moment",
      credit: "Photo by Example",
    })).toMatchObject({ alt: "Tim speaking on stage" });
  });

  it("rejects unsafe protocols and missing alternative text", () => {
    expect(externalHeroImageSchema.safeParse({ url: "javascript:alert(1)", alt: "" }).success)
      .toBe(false);
  });

  it("allows an explicit removal", () => {
    expect(updateArticleHeroImageInputSchema.safeParse({
      articleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      expectedRevision: 2,
      heroImage: null,
    }).success).toBe(true);
  });
});
