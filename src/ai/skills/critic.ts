import { z } from "zod";

import { criticCategoryIds, criticOutputSchema } from "@/ai/review/model";
import type { WritingSkill } from "@/ai/runtime/skill";
import { articleReviewInputSchema, type ArticleReviewInput } from "./humanizer";

export const criticSkill: WritingSkill<
  ArticleReviewInput,
  z.infer<typeof criticOutputSchema>
> = {
  id: "article-critic-review",
  version: "v1",
  name: "Article critic",
  description: "Reviews the whole article without changing it.",
  modelPurpose: "review",
  maxOutputTokens: 6_000,
  inputSchema: articleReviewInputSchema,
  outputSchema: criticOutputSchema,
  buildInstructions() {
    return [
      "Act as a precise editorial critic. Review the entire article but do not edit or rewrite it.",
      `Use only these categories: ${criticCategoryIds.join(", ")}.`,
      "Check claims, repetition, transitions, contradictions, abstraction, generated prose, opening, ending, and evidence.",
      "Quote an exact contiguous passage when a finding attaches to prose. Use null only for article-level findings.",
      "Do not demand false balance, generic structure, a conclusion heading, or certainty unsupported by the article.",
      "Prioritize useful findings; an empty findings list is valid when the article is sound.",
    ].join("\n");
  },
  buildInput(input) {
    return JSON.stringify({ title: input.title, article: input.plainText });
  },
};
