import { z } from "zod";

export const aiModelPurposes = [
  "interview",
  "draft",
  "edit",
  "review",
  "embedding",
] as const;

export type AiModelPurpose = (typeof aiModelPurposes)[number];

const modelNameSchema = z.string().trim().min(1).max(200);

export const aiModelConfigurationSchema = z.object({
  interview: modelNameSchema,
  draft: modelNameSchema,
  edit: modelNameSchema,
  review: modelNameSchema,
  embedding: modelNameSchema,
});

export type AiModelConfiguration = z.infer<
  typeof aiModelConfigurationSchema
>;

export function parseAiModelConfiguration(
  environment: Record<string, string | undefined>,
): AiModelConfiguration {
  return aiModelConfigurationSchema.parse({
    interview: environment.OPENAI_MODEL_INTERVIEW,
    draft: environment.OPENAI_MODEL_DRAFT,
    edit: environment.OPENAI_MODEL_EDIT,
    review: environment.OPENAI_MODEL_REVIEW,
    embedding: environment.OPENAI_MODEL_EMBEDDING,
  });
}

export function resolveAiModel(
  configuration: AiModelConfiguration,
  purpose: AiModelPurpose,
) {
  return configuration[purpose];
}
