import { z } from "zod";

import { httpUrlSchema } from "@/lib/validation/http-url";

const optionalCreditSchema = z.string().trim().max(300).optional();

export const externalHeroImageSchema = z.object({
  url: httpUrlSchema,
  alt: z.string().trim().min(1).max(300),
  caption: z.string().trim().max(500).optional(),
  credit: optionalCreditSchema,
});

export type ExternalHeroImage = z.infer<typeof externalHeroImageSchema>;

export const updateArticleHeroImageInputSchema = z.object({
  articleId: z.uuid(),
  expectedRevision: z.number().int().positive(),
  heroImage: externalHeroImageSchema.nullable(),
});
