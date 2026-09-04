import { describe, expect, it } from "vitest";

import {
  timbenniks2026Frontmatter,
  timbenniksDevCanonicalUrl,
  timbenniksDevWritingPath,
  websiteFrontmatter,
  websiteMarkdownFile,
  websitePublicationOutputs,
  websitePublicationPath,
  websitePublicationMetadataSchema,
  websiteReadingTime,
  type WebsitePublicationMetadata,
} from "./website";

const metadata: WebsitePublicationMetadata = {
  title: "Building MCP Profile Hub part 2, one MCP server is the wrong abstraction",
  slug: "building-mcp-profile-hub-part-2-one-mcp-server-is-the-wrong-abstraction",
  description:
    "This article argues that a single, monolithic MCP server per platform is the wrong abstraction, especially for complex systems like Contentstack.",
  date: "2026-09-04T10:00:00Z",
  image:
    "https://res.cloudinary.com/dwfcofnrd/image/upload/f_auto,q_auto/v1788518129/website/building-mcp-2.png",
  tags: [
    "composable-architecture",
    "api-design",
    "ai-engineering",
    "product-strategy",
  ],
  faqs: [
    {
      question: "Why is one MCP server per platform considered the wrong abstraction?",
      answer: "It exposes the whole platform catalog instead of the user's job.",
    },
  ],
};

describe("timbenniks.dev website publishing", () => {
  it("derives the current website path and canonical URL from a validated slug", () => {
    expect(timbenniksDevWritingPath(metadata.slug)).toBe(
      "content/4.writing/building-mcp-profile-hub-part-2-one-mcp-server-is-the-wrong-abstraction.md",
    );
    expect(timbenniksDevCanonicalUrl(metadata.slug)).toBe(
      "https://timbenniks.dev/writing/building-mcp-profile-hub-part-2-one-mcp-server-is-the-wrong-abstraction",
    );
    expect(websitePublicationPath("timbenniks-2026", metadata.slug)).toBe(
      "src/content/writing/building-mcp-profile-hub-part-2-one-mcp-server-is-the-wrong-abstraction.md",
    );
  });

  it("uses integer minute reading times compatible with the live page JSON-LD parser", () => {
    expect(websiteReadingTime("one two three")).toBe("1 min read");
    expect(websiteReadingTime(Array.from({ length: 221 }, () => "word").join(" "))).toBe(
      "2 min read",
    );
  });

  it("duplicates article metadata into the current Nuxt Content head shape", () => {
    expect(websiteFrontmatter({ metadata, plainText: "A short article." })).toEqual({
      title: metadata.title,
      slug: metadata.slug,
      description: metadata.description,
      date: metadata.date,
      canonical_url:
        "https://timbenniks.dev/writing/building-mcp-profile-hub-part-2-one-mcp-server-is-the-wrong-abstraction",
      reading_time: "1 min read",
      image: metadata.image,
      tags: metadata.tags,
      faqs: metadata.faqs,
      draft: false,
      head: {
        meta: [
          { property: "twitter:image", content: metadata.image },
          { property: "twitter:title", content: metadata.title },
          { property: "twitter:description", content: metadata.description },
          {
            property: "keywords",
            content:
              "composable-architecture, api-design, ai-engineering, product-strategy",
          },
        ],
      },
    });
  });

  it("emits only the frontmatter consumed by the Astro 2026 writing collection", () => {
    expect(timbenniks2026Frontmatter({
      metadata,
      plainText: "A short article.",
    })).toEqual({
      title: metadata.title,
      description: metadata.description,
      date: metadata.date,
      canonical_url:
        "https://timbenniks.dev/writing/building-mcp-profile-hub-part-2-one-mcp-server-is-the-wrong-abstraction",
      reading_time: "1 min read",
      image: metadata.image,
      tags: metadata.tags,
      faqs: metadata.faqs,
      draft: false,
    });
  });

  it("builds independently trackable Markdown outputs for both repositories", () => {
    const outputs = websitePublicationOutputs({
      metadata,
      plainText: "A short article.",
      bodyMarkdown: "The shared canonical body.",
    });

    expect(outputs.map(({ target, repository, path }) => ({
      target,
      repository,
      path,
    }))).toEqual([
      {
        target: "timbenniksdev-2024",
        repository: "timbenniks/timbenniksdev-2024",
        path:
          "content/4.writing/building-mcp-profile-hub-part-2-one-mcp-server-is-the-wrong-abstraction.md",
      },
      {
        target: "timbenniks-2026",
        repository: "timbenniks/timbenniks-2026",
        path:
          "src/content/writing/building-mcp-profile-hub-part-2-one-mcp-server-is-the-wrong-abstraction.md",
      },
    ]);
    expect(outputs[0]?.markdown).toContain("head:");
    expect(outputs[1]?.markdown).not.toContain("head:");
    expect(outputs[1]?.markdown).not.toContain("\nslug:");
    expect(outputs.every(({ markdown }) =>
      markdown.endsWith("The shared canonical body.\n"))).toBe(true);
  });

  it("serializes YAML frontmatter without relying on misleading apostrophe escaping", () => {
    const file = websiteMarkdownFile({
      metadata: {
        ...metadata,
        title: "Cursor's moat",
        description: "A plain YAML string with an apostrophe.",
      },
      plainText: "A short article.",
      bodyMarkdown: "The body stays below frontmatter.",
    });

    expect(file).toContain('title: "Cursor\'s moat"');
    expect(file).toContain('description: "A plain YAML string with an apostrophe."');
    expect(file).toContain("property: \"twitter:title\"");
    expect(file.endsWith("\n")).toBe(true);
  });

  it("rejects unsupported local publication paths and non-web image URLs", () => {
    expect(websitePublicationMetadataSchema.safeParse({
      ...metadata,
      slug: "Bad Slug",
    }).success).toBe(false);
    expect(websitePublicationMetadataSchema.safeParse({
      ...metadata,
      image: "javascript:alert(1)",
    }).success).toBe(false);
    expect(websitePublicationMetadataSchema.safeParse({
      ...metadata,
      tags: ["mcp"],
    }).success).toBe(false);
    expect(websitePublicationMetadataSchema.safeParse({
      ...metadata,
      tags: ["ai-engineering", "ai-engineering"],
    }).success).toBe(false);
  });
});
