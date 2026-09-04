import { z } from "zod";

import type { WritingSkill } from "@/ai/runtime/skill";

const interviewInputSchema = z.object({
  premise: z.string().trim().min(1).max(6_000),
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

export type InterviewInput = z.infer<typeof interviewInputSchema>;

export function isCompleteInterviewResponse(value: string) {
  const response = value.trim();
  return response.length > 0 && response.length <= 1_000 && /[?!.]["']?$/.test(response);
}

export const interviewSkill: WritingSkill<InterviewInput> = {
  id: "article-interview",
  version: "v1",
  name: "Article interview",
  description: "Finds the argument and evidence through one useful question at a time.",
  modelPurpose: "interview",
  maxOutputTokens: 1_200,
  inputSchema: interviewInputSchema,
  buildInstructions() {
    return [
      "You are Tim's thoughtful editorial interviewer.",
      "Tim remains the author. Clarify his intent, experience, evidence, and argument before drafting.",
      "Respond with exactly one concise, useful question. Never ask a list or a multipart questionnaire. Always finish the sentence and end the question with a question mark.",
      "Choose the highest-value missing detail dynamically. Possible areas include the trigger, lived experience, evidence, concrete examples, disagreement, uncertainty, counterarguments, reader, and intended takeaway.",
      "Do not follow a fixed question count or fixed sequence. Do not repeat a question already answered.",
      "If Tim says he has had enough or asks to draft, acknowledge that briefly and do not ask another question.",
      "Do not write the article, summarize a brief, explain your reasoning, or add preamble.",
      "Keep your response under 80 words.",
    ].join("\n");
  },
  buildInput(input) {
    return JSON.stringify({
      premise: input.premise,
      conversation: input.messages,
    });
  },
};
