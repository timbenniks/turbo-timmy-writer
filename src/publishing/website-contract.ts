import { z } from "zod";

import { httpUrlSchema } from "@/lib/validation/http-url";

export const websitePublicationTargets = [
  "timbenniksdev-2024",
  "timbenniks-2026",
] as const;

export type WebsitePublicationTarget =
  (typeof websitePublicationTargets)[number];

export const websitePublicationTags = [
  "composable-architecture",
  "cms",
  "api-design",
  "frontend",
  "performance",
  "cloud-infra",
  "developer-experience",
  "ai-engineering",
  "craft",
  "personalization",
  "devrel",
  "product-strategy",
  "content-ops",
  "career",
  "media-production",
  "personal",
  "opinion",
] as const;

export const websitePublicationSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(200);

const websitePublicationFaqSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(1_500),
});

const uniqueWebsiteTagsSchema = z.array(z.enum(websitePublicationTags))
  .min(1)
  .max(5)
  .refine((tags) => new Set(tags).size === tags.length, "Use each tag once.");

export const websitePublicationMetadataSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: websitePublicationSlugSchema,
  description: z.string().trim().min(1).max(1_000),
  date: z.iso.datetime({ offset: true }),
  image: httpUrlSchema,
  tags: uniqueWebsiteTagsSchema,
  faqs: z.array(websitePublicationFaqSchema).max(8).optional(),
  draft: z.boolean().default(false),
});

export const storedWebsitePublicationDetailsSchema = z.object({
  publicationDate: z.iso.datetime({ offset: true }).nullable().optional(),
  imageUrl: httpUrlSchema.nullable().optional(),
  tags: z.array(z.enum(websitePublicationTags)).max(5)
    .refine((tags) => new Set(tags).size === tags.length, "Use each tag once.")
    .optional(),
});

export type WebsitePublicationMetadata = z.input<
  typeof websitePublicationMetadataSchema
>;
export type WebsitePublicationTag = (typeof websitePublicationTags)[number];
