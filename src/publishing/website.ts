import { stringify } from "yaml";
import { z } from "zod";

import { calculateWritingMetrics } from "@/articles/metrics";
import { httpUrlSchema } from "@/lib/validation/http-url";

export const TIMBENNIKS_DEV_REPOSITORY = "timbenniks/timbenniksdev-2024";
export const TIMBENNIKS_DEV_WRITING_DIRECTORY = "content/4.writing";
export const TIMBENNIKS_DEV_ORIGIN = "https://timbenniks.dev";

export const websitePublicationSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(200);

export const websitePublicationFaqSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(1_500),
});

export const websitePublicationMetadataSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: websitePublicationSlugSchema,
  description: z.string().trim().min(1).max(1_000),
  date: z.iso.datetime({ offset: true }),
  image: httpUrlSchema,
  tags: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  faqs: z.array(websitePublicationFaqSchema).max(8).optional(),
  draft: z.boolean().default(false),
});

export type WebsitePublicationMetadata = z.input<
  typeof websitePublicationMetadataSchema
>;

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

export function timbenniksDevCanonicalUrl(slug: string) {
  const validSlug = websitePublicationSlugSchema.parse(slug);
  return `${TIMBENNIKS_DEV_ORIGIN}/writing/${validSlug}`;
}

export function timbenniksDevWritingPath(slug: string) {
  const validSlug = websitePublicationSlugSchema.parse(slug);
  return `${TIMBENNIKS_DEV_WRITING_DIRECTORY}/${validSlug}.md`;
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

export function websiteMarkdownFile(input: {
  metadata: WebsitePublicationMetadata;
  plainText: string;
  bodyMarkdown: string;
}) {
  const frontmatter = websiteFrontmatter({
    metadata: input.metadata,
    plainText: input.plainText,
  });
  const yaml = stringify(frontmatter, {
    lineWidth: 0,
    defaultKeyType: "PLAIN",
    defaultStringType: "QUOTE_DOUBLE",
  }).trimEnd();
  return `---\n${yaml}\n---\n\n${input.bodyMarkdown.trim()}\n`;
}
