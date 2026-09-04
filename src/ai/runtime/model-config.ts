import { z } from "zod";

export const aiModelPurposes = [
  "interview",
  "draft",
  "edit",
  "review",
  "repurpose",
  "embedding",
] as const;

export type AiModelPurpose = (typeof aiModelPurposes)[number];

const modelNameSchema = z.string().trim().min(1).max(200);

export const aiModelConfigurationSchema = z.object({
  interview: modelNameSchema,
  draft: modelNameSchema,
  edit: modelNameSchema,
  review: modelNameSchema,
  repurpose: modelNameSchema,
  embedding: modelNameSchema.optional(),
});

export type AiModelConfiguration = z.infer<
  typeof aiModelConfigurationSchema
>;

export function parseAiModelConfiguration(
  environment: Record<string, string | undefined>,
): AiModelConfiguration {
  const sharedModel = environment.OPENAI_MODEL;

  return aiModelConfigurationSchema.parse({
    interview: environment.OPENAI_MODEL_INTERVIEW ?? sharedModel,
    draft: environment.OPENAI_MODEL_DRAFT ?? sharedModel,
    edit: environment.OPENAI_MODEL_EDIT ?? sharedModel,
    review: environment.OPENAI_MODEL_REVIEW ?? sharedModel,
    repurpose: environment.OPENAI_MODEL_REPURPOSE ?? sharedModel,
    embedding: environment.OPENAI_MODEL_EMBEDDING,
  });
}

export function resolveAiModel(
  configuration: AiModelConfiguration,
  purpose: AiModelPurpose,
) {
  const model = configuration[purpose];
  if (!model) {
    throw new AiModelConfigurationError(purpose);
  }
  return model;
}

export class AiModelConfigurationError extends Error {
  constructor(public readonly purpose: AiModelPurpose) {
    super(`No AI model is configured for ${purpose}.`);
    this.name = "AiModelConfigurationError";
  }
}
