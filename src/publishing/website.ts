import { stringify } from "yaml";
import { z } from "zod";

import { calculateWritingMetrics } from "@/articles/metrics";
import {
  websitePublicationMetadataSchema,
  websitePublicationSlugSchema,
  websitePublicationTargets,
  type WebsitePublicationMetadata,
  type WebsitePublicationTarget,
} from "@/publishing/website-contract";

export {
  websitePublicationMetadataSchema,
  type WebsitePublicationMetadata,
} from "@/publishing/website-contract";

const TIMBENNIKS_DEV_REPOSITORY = "timbenniks/timbenniksdev-2024";
const TIMBENNIKS_DEV_WRITING_DIRECTORY = "content/4.writing";
const TIMBENNIKS_DEV_ORIGIN = "https://timbenniks.dev";

const websitePublicationTargetProfiles = {
  "timbenniksdev-2024": {
    repository: TIMBENNIKS_DEV_REPOSITORY,
    writingDirectory: TIMBENNIKS_DEV_WRITING_DIRECTORY,
  },
  "timbenniks-2026": {
    repository: "timbenniks/timbenniks-2026",
    writingDirectory: "src/content/writing",
  },
} as const;

export type WebsitePublicationFrontmatter = z.output<
  typeof websitePublicationMetadataSchema
> & {
  canonical_url: string;
  reading_time: string;
  head: {
    meta: [
      { property: "twitter:image"; content: string },
      { property: "twitter:title"; content: string },
      { property: "twitter:description"; content: string },
      { property: "keywords"; content: string },
    ];
  };
};

export type WebsitePublicationOutput = {
  target: WebsitePublicationTarget;
  repository: string;
  path: string;
  markdown: string;
};

export function timbenniksDevCanonicalUrl(slug: string) {
  const validSlug = websitePublicationSlugSchema.parse(slug);
  return `${TIMBENNIKS_DEV_ORIGIN}/writing/${validSlug}`;
}

export function timbenniksDevWritingPath(slug: string) {
  return websitePublicationPath("timbenniksdev-2024", slug);
}

export function websitePublicationPath(
  target: WebsitePublicationTarget,
  slug: string,
) {
  const validTarget = z.enum(websitePublicationTargets).parse(target);
  const validSlug = websitePublicationSlugSchema.parse(slug);
  return `${websitePublicationTargetProfiles[validTarget].writingDirectory}/${validSlug}.md`;
}

export function websiteReadingTime(plainText: string) {
  return `${calculateWritingMetrics(plainText).readingMinutes} min read`;
}

export function websiteFrontmatter(input: {
  metadata: WebsitePublicationMetadata;
  plainText: string;
}): WebsitePublicationFrontmatter {
  const metadata = websitePublicationMetadataSchema.parse(input.metadata);
  const canonicalUrl = timbenniksDevCanonicalUrl(metadata.slug);
  const keywords = metadata.tags.join(", ");

  return {
    title: metadata.title,
    slug: metadata.slug,
    description: metadata.description,
    date: metadata.date,
    canonical_url: canonicalUrl,
    reading_time: websiteReadingTime(input.plainText),
    image: metadata.image,
    tags: metadata.tags,
    ...(metadata.faqs ? { faqs: metadata.faqs } : {}),
    draft: metadata.draft,
    head: {
      meta: [
        { property: "twitter:image", content: metadata.image },
        { property: "twitter:title", content: metadata.title },
        { property: "twitter:description", content: metadata.description },
        { property: "keywords", content: keywords },
      ],
    },
  };
}

export function timbenniks2026Frontmatter(input: {
  metadata: WebsitePublicationMetadata;
  plainText: string;
}) {
  const metadata = websitePublicationMetadataSchema.parse(input.metadata);
  return {
    title: metadata.title,
    description: metadata.description,
    date: metadata.date,
    canonical_url: timbenniksDevCanonicalUrl(metadata.slug),
    reading_time: websiteReadingTime(input.plainText),
    image: metadata.image,
    tags: metadata.tags,
    ...(metadata.faqs ? { faqs: metadata.faqs } : {}),
    draft: metadata.draft,
  };
}

function serializeWebsiteMarkdown(frontmatter: object, bodyMarkdown: string) {
  const yaml = stringify(frontmatter, {
    lineWidth: 0,
    defaultKeyType: "PLAIN",
    defaultStringType: "QUOTE_DOUBLE",
  }).trimEnd();
  return `---\n${yaml}\n---\n\n${bodyMarkdown.trim()}\n`;
}

export function websiteMarkdownFile(input: {
  metadata: WebsitePublicationMetadata;
  plainText: string;
  bodyMarkdown: string;
}) {
  return websiteMarkdownFileForTarget("timbenniksdev-2024", input);
}

function websiteMarkdownFileForTarget(
  target: WebsitePublicationTarget,
  input: {
    metadata: WebsitePublicationMetadata;
    plainText: string;
    bodyMarkdown: string;
  },
) {
  const frontmatter = target === "timbenniks-2026"
    ? timbenniks2026Frontmatter(input)
    : websiteFrontmatter(input);
  return serializeWebsiteMarkdown(frontmatter, input.bodyMarkdown);
}

export function websitePublicationOutputs(input: {
  metadata: WebsitePublicationMetadata;
  plainText: string;
  bodyMarkdown: string;
}): WebsitePublicationOutput[] {
  const metadata = websitePublicationMetadataSchema.parse(input.metadata);
  return websitePublicationTargets.map((target) => ({
    target,
    repository: websitePublicationTargetProfiles[target].repository,
    path: websitePublicationPath(target, metadata.slug),
    markdown: websiteMarkdownFileForTarget(target, {
      ...input,
      metadata,
    }),
  }));
}
