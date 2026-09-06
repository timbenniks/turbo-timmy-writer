import { describe, expect, it } from "vitest";

import { applyCanonicalHeroToVariant } from "./variant";

describe("applyCanonicalHeroToVariant", () => {
  it("uses the canonical hero URL for website variants", () => {
    expect(applyCanonicalHeroToVariant({
      version: 1,
      destination: "website",
      title: "Title",
      slug: "title",
      description: "Description",
      canonicalUrl: null,
      imageUrl: null,
    }, {
      url: "https://images.example.com/canonical.jpg",
      alt: "Canonical hero",
    })).toMatchObject({ imageUrl: "https://images.example.com/canonical.jpg" });
  });

  it("does not add website fields to another destination", () => {
    const metadata = { version: 1 as const, destination: "linkedin-post" as const, publicationUrl: null };
    expect(applyCanonicalHeroToVariant(metadata, {
      url: "https://images.example.com/canonical.jpg",
      alt: "Canonical hero",
    })).toBe(metadata);
  });
});
