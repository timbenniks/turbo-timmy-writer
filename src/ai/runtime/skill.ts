import { z } from "zod";

import type { AiModelPurpose } from "./model-config";

export const writingContextItemSchema = z.object({
  id: z.string().min(1).max(200),
  kind: z.string().min(1).max(100),
  content: z.string().min(1),
});

export const writingContextSchema = z.array(writingContextItemSchema);

export const writingSkillMetadataSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/).max(100),
  version: z.string().regex(/^v[1-9][0-9]*$/).max(20),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
});

export type WritingContext = z.infer<typeof writingContextSchema>;

export interface WritingSkill<TInput, TOutput = string> {
  id: string;
  version: string;
  name: string;
  description: string;
  modelPurpose: AiModelPurpose;
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  buildInstructions(input: TInput): string;
  buildInput(input: TInput, context: WritingContext): string;
  resolveContext?(input: TInput): Promise<WritingContext>;
}
