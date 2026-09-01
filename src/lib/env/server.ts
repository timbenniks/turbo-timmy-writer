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
