import { z } from "zod";

import {
  editorActionIds,
  editorSuggestionOutputSchema,
} from "@/ai/editor/model";
import type { WritingSkill } from "@/ai/runtime/skill";

export const editorSkillInputSchema = z.object({
  actionId: z.enum(editorActionIds),
  instruction: z.string().trim().min(1).max(500).nullable(),
  originalText: z.string().min(1).max(8_000),
  before: z.string().max(2_000),
  after: z.string().max(2_000),
});

export type EditorSkillInput = z.infer<typeof editorSkillInputSchema>;

const actionInstructions: Record<Exclude<EditorSkillInput["actionId"], "custom">, string> = {
  tighten: "Remove filler and duplicated meaning while preserving every supported claim.",
  clarify: "Make the passage easier to understand without adding facts or certainty.",
  sharpen: "Make the argument more direct and specific without making it more absolute.",
  rhythm: "Improve sentence and paragraph rhythm while preserving meaning and tone.",
  alternative: "Offer a genuinely different phrasing that preserves the passage's meaning.",
};

export const editorSkill: WritingSkill<
  EditorSkillInput,
  z.infer<typeof editorSuggestionOutputSchema>
> = {
  id: "article-selection-editor",
  version: "v1",
  name: "Selection editor",
  description: "Transforms one selected passage into a reviewable suggestion.",
  modelPurpose: "edit",
  maxOutputTokens: 3_000,
  inputSchema: editorSkillInputSchema,
  outputSchema: editorSuggestionOutputSchema,
  buildInstructions(input) {
    const requested = input.actionId === "custom"
      ? `Follow this instruction: ${input.instruction}`
      : actionInstructions[input.actionId];
    return [
      "Edit only the selected passage. Return replacement prose, never commentary or a diff.",
      requested,
      "Tim remains the author. Preserve his meaning, facts, uncertainty, point of view, and intentional technical terms.",
      "Do not invent examples, evidence, citations, quotations, metrics, or personal experience.",
      "Use the surrounding text only for continuity. Do not rewrite it.",
      "Keep plain text line breaks when useful and do not return Markdown fences.",
    ].join("\n");
  },
  buildInput(input) {
    return JSON.stringify({
      selectedPassage: input.originalText,
      contextBefore: input.before,
      contextAfter: input.after,
    });
  },
};
