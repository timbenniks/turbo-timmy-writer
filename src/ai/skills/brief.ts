import { z } from "zod";

import { articleBriefSchema } from "@/ai/brief/model";
import type { WritingSkill } from "@/ai/runtime/skill";

export const briefUpdateInputSchema = z.object({
  currentBrief: articleBriefSchema,
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().trim().min(1).max(20_000),
      }),
    )
    .min(2)
    .max(60),
});

export type BriefUpdateInput = z.infer<typeof briefUpdateInputSchema>;

export const briefUpdateSkill: WritingSkill<
  BriefUpdateInput,
  z.infer<typeof articleBriefSchema>
> = {
  id: "article-brief-update",
  version: "v1",
  name: "Article brief update",
  description: "Updates the working brief from explicit interview evidence.",
  modelPurpose: "interview",
  maxOutputTokens: 3_000,
  inputSchema: briefUpdateInputSchema,
  outputSchema: articleBriefSchema,
  buildInstructions() {
    return [
      "Maintain Tim's structured working article brief from the interview.",
      "Return the complete brief, not a patch.",
      "Preserve the premise exactly unless Tim explicitly corrects it.",
      "Add only claims, evidence, examples, experiences, audiences, uncertainties, counterarguments, angles, takeaways, or avoidances supported by Tim's words.",
      "Do not invent facts, polish the argument into certainty, or treat the assistant's questions as evidence.",
      "Deduplicate concise list items while preserving meaningful tension and uncertainty.",
      "Use null for optional strings and empty arrays when the interview has not established them.",
    ].join("\n");
  },
  buildInput(input) {
    return JSON.stringify(input);
  },
};
