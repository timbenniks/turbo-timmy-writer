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

const githubPublisherEnvironmentSchema = z.object({
  GITHUB_PUBLISH_TOKEN: z.string().trim().min(1),
  GITHUB_PUBLISH_BRANCH: z.string().trim().min(1).max(255).default("main"),
});

const githubBackupEnvironmentSchema = z.object({
  GITHUB_PUBLISH_TOKEN: z.string().trim().min(1),
  GITHUB_BACKUP_REPOSITORY: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  GITHUB_BACKUP_PATH: z.string().trim().min(1).max(1_024)
    .refine((path) => !path.startsWith("/") && !path.split("/").includes("..")),
  GITHUB_BACKUP_BRANCH: z.string().trim().min(1).max(255).default("main"),
});

const cloudinaryEnvironmentSchema = z.object({
  CLOUDINARY_CLOUD_NAME: z.string().trim().regex(/^[a-z0-9_-]+$/i).max(100),
  CLOUDINARY_API_KEY: z.string().trim().min(1).max(200),
  CLOUDINARY_API_SECRET: z.string().trim().min(1).max(500),
});

const buttondownEnvironmentSchema = z.object({
  BUTTONDOWN_API_KEY: z.string().trim().min(1).max(500),
});

const contentstackEnvironmentSchema = z.object({
  CONTENTSTACK_API_HOST: z.url().startsWith("https://").default("https://api.contentstack.io"),
  CONTENTSTACK_API_KEY: z.string().trim().min(1).max(500),
  CONTENTSTACK_MANAGEMENT_TOKEN: z.string().trim().min(1).max(1_000),
  CONTENTSTACK_CONTENT_TYPE_UID: z.string().trim().regex(/^[a-z0-9_]+$/).max(200),
  CONTENTSTACK_LOCALE: z.string().trim().regex(/^[a-z]{2}(?:-[a-z]{2})?$/i).default("en-us"),
  CONTENTSTACK_BRANCH: z.string().trim().min(1).max(200).default("main"),
});

const linkedinEnvironmentSchema = z.object({
  LINKEDIN_ACCESS_TOKEN: z.string().trim().min(1).max(2_000),
  LINKEDIN_AUTHOR_URN: z.string().trim().regex(/^urn:li:person:[0-9]+$/).max(200),
  LINKEDIN_API_VERSION: z.string().regex(/^20[0-9]{4}$/),
});

export type ArchiveEmbeddingEnvironment = {
  apiKey: string;
  model: string;
};

export type GitHubPublisherEnvironment = {
  token: string;
  branch: string;
};
export type GitHubBackupEnvironment = {
  token: string;
  repository: string;
  path: string;
  branch: string;
};

export type CloudinaryEnvironment = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export type ButtondownEnvironment = { apiKey: string };
export type ContentstackEnvironment = {
  apiHost: string;
  apiKey: string;
  managementToken: string;
  contentTypeUid: string;
  locale: string;
  branch: string;
};
export type LinkedInEnvironment = { accessToken: string; authorUrn: string; apiVersion: string };

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

export function readGitHubPublisherEnvironment(): GitHubPublisherEnvironment | null {
  const result = githubPublisherEnvironmentSchema.safeParse({
    GITHUB_PUBLISH_TOKEN: process.env.GITHUB_PUBLISH_TOKEN,
    GITHUB_PUBLISH_BRANCH: process.env.GITHUB_PUBLISH_BRANCH,
  });
  return result.success
    ? { token: result.data.GITHUB_PUBLISH_TOKEN, branch: result.data.GITHUB_PUBLISH_BRANCH }
    : null;
}

export function readGitHubBackupEnvironment(): GitHubBackupEnvironment | null {
  const result = githubBackupEnvironmentSchema.safeParse({
    GITHUB_PUBLISH_TOKEN: process.env.GITHUB_PUBLISH_TOKEN,
    GITHUB_BACKUP_REPOSITORY: process.env.GITHUB_BACKUP_REPOSITORY,
    GITHUB_BACKUP_PATH: process.env.GITHUB_BACKUP_PATH,
    GITHUB_BACKUP_BRANCH: process.env.GITHUB_BACKUP_BRANCH,
  });
  return result.success ? {
    token: result.data.GITHUB_PUBLISH_TOKEN,
    repository: result.data.GITHUB_BACKUP_REPOSITORY,
    path: result.data.GITHUB_BACKUP_PATH,
    branch: result.data.GITHUB_BACKUP_BRANCH,
  } : null;
}

export function readCloudinaryEnvironment(): CloudinaryEnvironment | null {
  const result = cloudinaryEnvironmentSchema.safeParse({
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  });
  return result.success
    ? {
        cloudName: result.data.CLOUDINARY_CLOUD_NAME,
        apiKey: result.data.CLOUDINARY_API_KEY,
        apiSecret: result.data.CLOUDINARY_API_SECRET,
      }
    : null;
}

export function readButtondownEnvironment(): ButtondownEnvironment | null {
  const result = buttondownEnvironmentSchema.safeParse({
    BUTTONDOWN_API_KEY: process.env.BUTTONDOWN_API_KEY,
  });
  return result.success ? { apiKey: result.data.BUTTONDOWN_API_KEY } : null;
}

export function readContentstackEnvironment(): ContentstackEnvironment | null {
  const result = contentstackEnvironmentSchema.safeParse({
    CONTENTSTACK_API_HOST: process.env.CONTENTSTACK_API_HOST,
    CONTENTSTACK_API_KEY: process.env.CONTENTSTACK_API_KEY,
    CONTENTSTACK_MANAGEMENT_TOKEN: process.env.CONTENTSTACK_MANAGEMENT_TOKEN,
    CONTENTSTACK_CONTENT_TYPE_UID: process.env.CONTENTSTACK_CONTENT_TYPE_UID,
    CONTENTSTACK_LOCALE: process.env.CONTENTSTACK_LOCALE,
    CONTENTSTACK_BRANCH: process.env.CONTENTSTACK_BRANCH,
  });
  return result.success ? {
    apiHost: result.data.CONTENTSTACK_API_HOST.replace(/\/$/u, ""),
    apiKey: result.data.CONTENTSTACK_API_KEY,
    managementToken: result.data.CONTENTSTACK_MANAGEMENT_TOKEN,
    contentTypeUid: result.data.CONTENTSTACK_CONTENT_TYPE_UID,
    locale: result.data.CONTENTSTACK_LOCALE.toLowerCase(),
    branch: result.data.CONTENTSTACK_BRANCH,
  } : null;
}

export function readLinkedInEnvironment(): LinkedInEnvironment | null {
  const result = linkedinEnvironmentSchema.safeParse({
    LINKEDIN_ACCESS_TOKEN: process.env.LINKEDIN_ACCESS_TOKEN,
    LINKEDIN_AUTHOR_URN: process.env.LINKEDIN_AUTHOR_URN,
    LINKEDIN_API_VERSION: process.env.LINKEDIN_API_VERSION,
  });
  return result.success ? {
    accessToken: result.data.LINKEDIN_ACCESS_TOKEN,
    authorUrn: result.data.LINKEDIN_AUTHOR_URN,
    apiVersion: result.data.LINKEDIN_API_VERSION,
  } : null;
}

export function isLocalGuidedAiTestMode() {
  const mode = z.literal("guided-test").safeParse(process.env.AI_PROVIDER_MODE);
  return process.env.VERCEL !== "1" && mode.success;
}
