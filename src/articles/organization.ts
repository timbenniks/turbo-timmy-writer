import { z } from "zod";

import { articleIdSchema, articleStatusSchema } from "./model";

const MAX_ARTICLE_TAGS = 10;

const tagLabelSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((value) => !value.includes(","), "Tags cannot contain commas.")
  .transform((value) => value.normalize("NFKC").replace(/\s+/g, " "));

export const updateArticleStatusInputSchema = z.object({
  articleId: articleIdSchema,
  expectedStatus: articleStatusSchema,
  nextStatus: articleStatusSchema,
});

export const updateArticleTagsInputSchema = z.object({
  articleId: articleIdSchema,
  tags: z.array(tagLabelSchema).max(MAX_ARTICLE_TAGS),
});

export const createCheckpointInputSchema = z.object({
  articleId: articleIdSchema,
  expectedRevision: z.int().positive(),
  label: z.string().trim().max(80).optional(),
});

export const createTaxonomyTagInputSchema = z.object({
  label: tagLabelSchema,
});

export const renameTaxonomyTagInputSchema = z.object({
  tagId: z.uuid(),
  label: tagLabelSchema,
});

export const deleteTaxonomyTagInputSchema = z.object({
  tagId: z.uuid(),
});

export type TagTaxonomyItem = {
  id: string;
  label: string;
  normalizedName: string;
  usageCount: number;
};

export function normalizeTagName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function canonicalizeTagLabels(values: readonly string[]) {
  const uniqueTags = new Map<string, string>();

  for (const value of values) {
    const parsed = tagLabelSchema.safeParse(value);
    if (!parsed.success) continue;
    const normalizedName = normalizeTagName(parsed.data);
    if (!uniqueTags.has(normalizedName)) uniqueTags.set(normalizedName, parsed.data);
  }

  return [...uniqueTags.entries()]
    .map(([normalizedName, label]) => ({ normalizedName, label }))
    .sort((left, right) => left.normalizedName.localeCompare(right.normalizedName))
    .slice(0, MAX_ARTICLE_TAGS);
}

export function parseTagDraft(value: string) {
  return canonicalizeTagLabels(value.split(",")).map((tag) => tag.label);
}
