import "server-only";

import { z } from "zod";

import {
  parseAiModelConfiguration,
  type AiModelConfiguration,
} from "@/ai/runtime/model-config";

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.url(),
});

const authEnvironmentSchema = z.object({
  AUTH_SECRET: z.string().min(32),
  AUTH_GITHUB_ID: z.string().min(1),
  AUTH_GITHUB_SECRET: z.string().min(1),
  ALLOWED_GITHUB_LOGIN: z
    .string()
    .min(1)
    .transform((login) => login.trim().toLowerCase()),
});

export type AuthEnvironment = z.infer<typeof authEnvironmentSchema>;

export type AiEnvironment = {
  apiKey: string;
  models: AiModelConfiguration;
};

const archiveEmbeddingEnvironmentSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL_EMBEDDING: z.string().trim()
    .regex(/^text-embedding-3-[a-z0-9-]+$/)
    .max(200),
});

export type ArchiveEmbeddingEnvironment = {
  apiKey: string;
  model: string;
};

export function getDatabaseUrl() {
  return databaseEnvironmentSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
  }).DATABASE_URL;
}

export function readAuthEnvironment(): AuthEnvironment | null {
  const result = authEnvironmentSchema.safeParse({
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    ALLOWED_GITHUB_LOGIN: process.env.ALLOWED_GITHUB_LOGIN,
  });

  return result.success ? result.data : null;
}

export function readAiEnvironment(): AiEnvironment | null {
  const apiKey = z.string().min(1).safeParse(process.env.OPENAI_API_KEY);
  if (!apiKey.success) return null;

  try {
    return {
      apiKey: apiKey.data,
      models: parseAiModelConfiguration(process.env),
    };
  } catch {
    return null;
  }
}

export function readArchiveEmbeddingEnvironment(): ArchiveEmbeddingEnvironment | null {
  const result = archiveEmbeddingEnvironmentSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL_EMBEDDING: process.env.OPENAI_MODEL_EMBEDDING,
  });
  return result.success
    ? { apiKey: result.data.OPENAI_API_KEY, model: result.data.OPENAI_MODEL_EMBEDDING }
    : null;
}

export function isLocalGuidedAiTestMode() {
  const mode = z.literal("guided-test").safeParse(process.env.AI_PROVIDER_MODE);
  return process.env.VERCEL !== "1" && mode.success;
}
