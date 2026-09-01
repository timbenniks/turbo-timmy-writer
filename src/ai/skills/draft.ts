import { z } from "zod";

import { articleBriefSchema } from "@/ai/brief/model";
import type { WritingSkill } from "@/ai/runtime/skill";

export const draftInputSchema = z.object({
  brief: articleBriefSchema,
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().trim().min(1).max(20_000),
      }),
    )
    .min(1)
    .max(60),
});

export type DraftInput = z.infer<typeof draftInputSchema>;

export const draftSkill: WritingSkill<DraftInput> = {
  id: "article-first-draft",
  version: "v1",
  name: "Article first draft",
  description: "Creates a complete first draft from the approved brief and interview.",
  modelPurpose: "draft",
  maxOutputTokens: 10_000,
  inputSchema: draftInputSchema,
  buildInstructions() {
    return [
      "Write a complete, useful first draft for Tim from the working brief and interview evidence.",
      "Tim remains the author. Preserve his argument, uncertainty, concrete experience, and disagreements; do not invent facts, quotes, metrics, or personal stories.",
      "Return Markdown only. The first line must be exactly one H1 title. Use H2/H3 sections, paragraphs, lists, blockquotes, emphasis, links, and code only when useful.",
      "Do not add frontmatter, meta commentary, a generic introduction, a forced conclusion heading, or citations that were not supplied.",
      "Prefer direct openings, specific language, varied rhythm, qualified strong claims, and a natural ending. Do not imitate a rigid template or recurring phrase.",
      "Use the brief as intent and the conversation as supporting evidence. If evidence is thin, write honestly around the uncertainty rather than filling gaps.",
    ].join("\n");
  },
  buildInput(input) {
    return JSON.stringify(input);
  },
};
