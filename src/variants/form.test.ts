import { describe, expect, it } from "vitest";

import type { WebsitePublicationTag } from "@/publishing/website-contract";
import { variantFormFromStored, variantPayloadFromForm } from "./form";

describe("variant form projection", () => {
  it("round-trips persisted website publication metadata", () => {
    const stored = {
      contentJson: {
        version: 1 as const,
        destination: "website" as const,
        bodyMarkdown: "Body",
      },
      metadataJson: {
        version: 1 as const,
        destination: "website" as const,
        title: "Title",
        slug: "title",
        description: "Description",
        canonicalUrl: "https://timbenniks.dev/writing/title",
        publicationDate: "2026-09-05T10:00:00Z",
        imageUrl: "https://images.example.com/title.png",
        tags: ["ai-engineering", "product-strategy"] as WebsitePublicationTag[],
      },
      status: "ready" as const,
    };

    expect(variantPayloadFromForm(
      "website",
      variantFormFromStored(stored),
    )).toEqual({
      content: stored.contentJson,
      metadata: {
        ...stored.metadataJson,
        tags: [...stored.metadataJson.tags],
      },
    });
  });

  it("round-trips newsletter fields without leaking another destination's metadata", () => {
    const stored = {
      contentJson: {
        version: 1 as const,
        destination: "newsletter" as const,
        bodyMarkdown: "Body",
        intro: "Intro",
        callToAction: null,
      },
      metadataJson: {
        version: 1 as const,
        destination: "newsletter" as const,
        subject: "Subject",
        previewText: "Preview",
      },
      status: "draft" as const,
    };
    const payload = variantPayloadFromForm("newsletter", variantFormFromStored(stored));

    expect(payload).toEqual({ content: stored.contentJson, metadata: stored.metadataJson });
    expect(payload.metadata).not.toHaveProperty("publicationUrl");
  });

  it("rejects an unsafe publication URL before persistence", () => {
    const form = variantFormFromStored({
      contentJson: { version: 1, destination: "linkedin-post", bodyMarkdown: "Post" },
      metadataJson: { version: 1, destination: "linkedin-post", publicationUrl: null },
      status: "draft",
    });
    expect(() => variantPayloadFromForm("linkedin-post", {
      ...form,
      publicationUrl: "javascript:alert(1)",
    })).toThrow();
  });
});
