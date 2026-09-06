import { z } from "zod";

import { httpUrlSchema } from "@/lib/validation/http-url";

export const sourceTypes = [
  "webpage",
  "book",
  "paper",
  "interview",
  "video",
  "note",
  "other",
] as const;

export const sourceTypeSchema = z.enum(sourceTypes);

const optionalText = (maximum: number) => z.string().trim().max(maximum).nullable().optional();

export const sourceInputSchema = z.object({
  type: sourceTypeSchema,
  title: z.string().trim().min(1).max(300),
  url: httpUrlSchema.nullable().optional(),
  text: optionalText(50_000),
  notes: optionalText(20_000),
});

export const articleSourceDetailsSchema = z.object({
  quote: optionalText(5_000),
  context: optionalText(2_000),
  position: z.number().int().nonnegative().max(1_000_000).default(0),
});

export const createArticleSourceInputSchema = z.object({
  articleId: z.uuid(),
  source: sourceInputSchema,
  link: articleSourceDetailsSchema,
});

export const updateArticleSourceInputSchema = z.object({
  articleId: z.uuid(),
  sourceId: z.uuid(),
  source: sourceInputSchema,
  link: articleSourceDetailsSchema,
});

export const removeArticleSourceInputSchema = z.object({
  articleId: z.uuid(),
  sourceId: z.uuid(),
});

export type SourceType = z.infer<typeof sourceTypeSchema>;
export type SourceInput = z.infer<typeof sourceInputSchema>;
export type ArticleSourceDetails = z.infer<typeof articleSourceDetailsSchema>;
