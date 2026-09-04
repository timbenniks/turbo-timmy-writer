import { z } from "zod";

export const variantDestinations = [
  "website",
  "linkedin-post",
  "linkedin-article",
  "newsletter",
] as const;
export const variantStatuses = ["draft", "ready", "published"] as const;

const markdownSchema = z.string().max(150_000);

export const websiteVariantContentSchema = z.object({
  version: z.literal(1),
  destination: z.literal("website"),
  bodyMarkdown: markdownSchema,
});
export const linkedinPostVariantContentSchema = z.object({
  version: z.literal(1),
  destination: z.literal("linkedin-post"),
  bodyMarkdown: z.string().max(3_000),
});
export const linkedinArticleVariantContentSchema = z.object({
  version: z.literal(1),
  destination: z.literal("linkedin-article"),
  bodyMarkdown: markdownSchema,
});
export const newsletterVariantContentSchema = z.object({
  version: z.literal(1),
  destination: z.literal("newsletter"),
  bodyMarkdown: markdownSchema,
  intro: z.string().trim().max(2_000).nullable(),
  callToAction: z.string().trim().max(1_000).nullable(),
});

export const variantContentSchema = z.discriminatedUnion("destination", [
  websiteVariantContentSchema,
  linkedinPostVariantContentSchema,
  linkedinArticleVariantContentSchema,
  newsletterVariantContentSchema,
]);

export const websiteVariantMetadataSchema = z.object({
  version: z.literal(1),
  destination: z.literal("website"),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(200),
  description: z.string().trim().max(320),
  canonicalUrl: z.url().nullable(),
});
export const linkedinPostVariantMetadataSchema = z.object({
  version: z.literal(1),
  destination: z.literal("linkedin-post"),
  publicationUrl: z.url().nullable(),
});
export const linkedinArticleVariantMetadataSchema = z.object({
  version: z.literal(1),
  destination: z.literal("linkedin-article"),
  title: z.string().trim().min(1).max(200),
  publicationUrl: z.url().nullable(),
});
export const newsletterVariantMetadataSchema = z.object({
  version: z.literal(1),
  destination: z.literal("newsletter"),
  subject: z.string().trim().min(1).max(200),
  previewText: z.string().trim().max(300),
});

export const variantMetadataSchema = z.discriminatedUnion("destination", [
  websiteVariantMetadataSchema,
  linkedinPostVariantMetadataSchema,
  linkedinArticleVariantMetadataSchema,
  newsletterVariantMetadataSchema,
]);

export const variantIdSchema = z.uuid();

export const variantSnapshotSchema = z.object({
  sourceArticleRevision: z.number().int().positive(),
  sourceContentHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export function variantFreshness(
  source: z.infer<typeof variantSnapshotSchema>,
  current: z.infer<typeof variantSnapshotSchema>,
) {
  const revisionChanged = source.sourceArticleRevision !== current.sourceArticleRevision;
  const contentChanged = source.sourceContentHash !== current.sourceContentHash;
  return {
    stale: revisionChanged || contentChanged,
    revisionChanged,
    contentChanged,
  };
}

export function regenerationGuard(input: {
  hasManualEdits: boolean;
  confirmed: boolean;
}) {
  if (input.hasManualEdits && !input.confirmed) {
    return { allowed: false, snapshotRequired: true } as const;
  }
  return { allowed: true, snapshotRequired: true } as const;
}

export type VariantDestination = (typeof variantDestinations)[number];
export type VariantStatus = (typeof variantStatuses)[number];
export type VariantContent = z.infer<typeof variantContentSchema>;
export type VariantMetadata = z.infer<typeof variantMetadataSchema>;
