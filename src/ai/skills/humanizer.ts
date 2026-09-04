import { z } from "zod";

import {
  humanizerCatalogV1,
  humanizerOutputSchema,
} from "@/ai/review/model";
import type { WritingSkill } from "@/ai/runtime/skill";

export const articleReviewInputSchema = z.object({
  title: z.string().max(200),
  plainText: z.string().trim().min(1).max(1_000_000),
  sourceRevision: z.number().int().positive(),
});

export type ArticleReviewInput = z.infer<typeof articleReviewInputSchema>;

export const humanizerSkill: WritingSkill<
  ArticleReviewInput,
  z.infer<typeof humanizerOutputSchema>
> = {
  id: "article-humanizer-review",
  version: "v1",
  name: "Humanizer review",
  description: "Detects generated-writing patterns without rewriting prose.",
  modelPurpose: "review",
  maxOutputTokens: 5_000,
  inputSchema: articleReviewInputSchema,
  outputSchema: humanizerOutputSchema,
  buildInstructions() {
    return [
      "Review the article for generated-writing patterns. Detect only; do not rewrite any prose.",
      "Every finding must quote an exact, contiguous passage from the supplied article.",
      "One isolated word is rarely enough. Report meaningful patterns and clusters, not a mechanical blacklist.",
      "Respect technical terminology and deliberate authorial choices. Keep the summary concise.",
      `Use this versioned catalog: ${JSON.stringify(humanizerCatalogV1)}.`,
    ].join("\n");
  },
  buildInput(input) {
    return JSON.stringify({ title: input.title, article: input.plainText });
  },
};
