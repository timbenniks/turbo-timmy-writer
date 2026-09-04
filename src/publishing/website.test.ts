import { describe, expect, it } from "vitest";

import {
  timbenniksDevCanonicalUrl,
  timbenniksDevWritingPath,
  websiteFrontmatter,
  websiteMarkdownFile,
  websitePublicationMetadataSchema,
  websiteReadingTime,
} from "./website";

const metadata = {
  title: "Building MCP Profile Hub part 2, one MCP server is the wrong abstraction",
  slug: "building-mcp-profile-hub-part-2-one-mcp-server-is-the-wrong-abstraction",
  description:
    "This article argues that a single, monolithic MCP server per platform is the wrong abstraction, especially for complex systems like Contentstack.",
  date: "2026-09-04T10:00:00Z",
  image:
    "https://res.cloudinary.com/dwfcofnrd/image/upload/f_auto,q_auto/v1788518129/website/building-mcp-2.png",
  tags: ["mcp", "architecture", "api", "composable", "webdev", "dxp", "process"],
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
          { property: "keywords", content: "mcp, architecture, api, composable, webdev, dxp, process" },
        ],
      },
    });
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
  });
});
