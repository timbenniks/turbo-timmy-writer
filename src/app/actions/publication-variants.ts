"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { articleIdSchema } from "@/articles/model";
import { getAllowedSession } from "@/auth/session";
import { getArticleForUser } from "@/db/queries/articles";
import {
  createPendingPublicationForUser,
  failPublicationForUser,
  latestSuccessfulPublicationForTarget,
  succeedPublicationForUser,
} from "@/db/queries/publications";
import {
  getPublicationVariantForUser,
  markPublicationVariantPublishedForUser,
  savePublicationVariantForUser,
} from "@/db/queries/publication-variants";
import { readGitHubPublisherEnvironment } from "@/lib/env/server";
import {
  createGitHubPublisher,
  GitHubPublisherError,
} from "@/publishing/adapters/github";
import {
  timbenniksDevCanonicalUrl,
  websitePublicationOutputs,
} from "@/publishing/website";
import {
  websitePublicationMetadataSchema,
  websitePublicationTargets,
} from "@/publishing/website-contract";
import { hashCanonicalArticle } from "@/variants/hashing";
import {
  variantFreshness,
  variantIdSchema,
  variantPayloadSchema,
  variantStatuses,
} from "@/variants/model";

const saveVariantInputSchema = z.object({
  articleId: articleIdSchema,
  variantId: variantIdSchema,
  expectedRevision: z.number().int().positive(),
  payload: variantPayloadSchema,
  status: z.enum(variantStatuses),
});

const publishWebsiteInputSchema = z.object({
  articleId: articleIdSchema,
  variantId: variantIdSchema,
  expectedRevision: z.number().int().positive(),
  target: z.enum(websitePublicationTargets),
  confirmed: z.literal(true),
});

const websiteRepositories = [
  "timbenniks/timbenniksdev-2024",
  "timbenniks/timbenniks-2026",
] as const;

export type SaveVariantResult =
  | { ok: true; revision: number; savedAt: string }
  | {
      ok: false;
      code: "unauthorized" | "invalid" | "not-found" | "conflict";
      message: string;
      currentRevision?: number;
    };

export async function savePublicationVariantAction(input: unknown): Promise<SaveVariantResult> {
  const session = await getAllowedSession();
  if (!session) return { ok: false, code: "unauthorized", message: "Your session has expired." };

  const parsed = saveVariantInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", message: "The variant contains invalid destination content." };
  }
  try {
    const result = await savePublicationVariantForUser({
      variantId: parsed.data.variantId,
      userId: session.user.id,
      expectedRevision: parsed.data.expectedRevision,
      content: parsed.data.payload.content,
      metadata: parsed.data.payload.metadata,
      status: parsed.data.status,
    });
    if (!result) return { ok: false, code: "not-found", message: "This variant was not found." };
    if (result.status === "conflict") {
      return {
        ok: false,
        code: "conflict",
        currentRevision: result.currentRevision,
        message: "This variant changed elsewhere. Reload before saving.",
      };
    }
    revalidatePath(`/articles/${parsed.data.articleId}/variants`);
    return {
      ok: true,
      revision: result.variant.revision,
      savedAt: result.variant.updatedAt.toISOString(),
    };
  } catch {
    return { ok: false, code: "invalid", message: "The variant does not match its destination." };
  }
}

export type PublishWebsiteResult =
  | {
      ok: true;
      operation: "create" | "update";
      commitSha: string;
      canonicalUrl: string;
    }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid"
        | "not-found"
        | "conflict"
        | "stale"
        | "not-ready"
        | "configuration"
        | "path-changed"
        | "provider";
      message: string;
    };

export async function publishWebsiteVariantAction(input: unknown): Promise<PublishWebsiteResult> {
  const session = await getAllowedSession();
  if (!session) return { ok: false, code: "unauthorized", message: "Your session has expired." };
  const parsed = publishWebsiteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", message: "The publication confirmation is invalid." };
  }

  const [variant, article] = await Promise.all([
    getPublicationVariantForUser(parsed.data.variantId, session.user.id),
    getArticleForUser(parsed.data.articleId, session.user.id),
  ]);
  if (
    !variant ||
    !article ||
    variant.articleId !== article.id ||
    variant.destination !== "website" ||
    variant.contentJson.destination !== "website" ||
    variant.metadataJson.destination !== "website"
  ) {
    return { ok: false, code: "not-found", message: "The website variant was not found." };
  }
  if (variant.revision !== parsed.data.expectedRevision) {
    return { ok: false, code: "conflict", message: "The variant changed. Reload before publishing." };
  }
  if (variant.status === "draft") {
    return { ok: false, code: "not-ready", message: "Save the website variant as Ready before publishing." };
  }
  const freshness = variantFreshness({
    sourceArticleRevision: variant.sourceArticleRevision,
    sourceContentHash: variant.sourceContentHash,
  }, {
    sourceArticleRevision: article.revision,
    sourceContentHash: hashCanonicalArticle(article),
  });
  if (freshness.stale) {
    return { ok: false, code: "stale", message: "Regenerate the stale variant before publishing." };
  }

  const metadata = websitePublicationMetadataSchema.safeParse({
    title: variant.metadataJson.title,
    slug: variant.metadataJson.slug,
    description: variant.metadataJson.description,
    date: variant.metadataJson.publicationDate,
    image: variant.metadataJson.imageUrl,
    tags: variant.metadataJson.tags,
    draft: false,
  });
  if (!metadata.success) {
    return { ok: false, code: "invalid", message: "Complete and save all required website metadata before publishing." };
  }
  const output = websitePublicationOutputs({
    metadata: metadata.data,
    plainText: variant.contentJson.bodyMarkdown,
    bodyMarkdown: variant.contentJson.bodyMarkdown,
  }).find(({ target }) => target === parsed.data.target);
  if (!output) return { ok: false, code: "invalid", message: "The publication target is invalid." };

  const environment = readGitHubPublisherEnvironment();
  if (!environment) {
    return { ok: false, code: "configuration", message: "GitHub publishing is not configured." };
  }
  const previous = await latestSuccessfulPublicationForTarget({
    variantId: variant.id,
    userId: session.user.id,
    target: output.target,
  });
  if (previous && (
    previous.repository !== output.repository ||
    previous.path !== output.path ||
    previous.branch !== environment.branch
  )) {
    return {
      ok: false,
      code: "path-changed",
      message: "The published path changed. Restore the published slug or handle the repository rename explicitly.",
    };
  }

  const publisher = createGitHubPublisher({
    token: environment.token,
    allowedRepositories: websiteRepositories,
  });
  let remote;
  try {
    remote = await publisher.inspectFile({
      repository: output.repository,
      path: output.path,
      branch: environment.branch,
    });
  } catch (error) {
    const message = error instanceof GitHubPublisherError
      ? error.message
      : "GitHub could not inspect the publication target.";
    return { ok: false, code: "provider", message };
  }
  const operation = remote ? "update" : "create";
  const contentHash = createHash("sha256").update(output.markdown).digest("hex");
  const attempt = await createPendingPublicationForUser({
    userId: session.user.id,
    articleId: article.id,
    variantId: variant.id,
    expectedVariantRevision: variant.revision,
    expectedArticleRevision: article.revision,
    sourceContentHash: variant.sourceContentHash,
    target: output.target,
    operation,
    repository: output.repository,
    path: output.path,
    branch: environment.branch,
    markdownSnapshot: output.markdown,
    contentHash,
    expectedBlobSha: remote?.sha ?? null,
  });
  if (!attempt) {
    return { ok: false, code: "conflict", message: "Another publication is running or the variant changed. Reload before retrying." };
  }

  try {
    const result = await publisher.writeFile({
      repository: output.repository,
      path: output.path,
      branch: environment.branch,
      message: `${operation === "create" ? "Publish" : "Update"} ${metadata.data.title}`,
      content: output.markdown,
      expectedSha: remote?.sha,
    });
    const canonicalUrl = timbenniksDevCanonicalUrl(metadata.data.slug);
    const completed = await succeedPublicationForUser({
      publicationId: attempt.id,
      userId: session.user.id,
      commitSha: result.commit.sha,
      blobSha: result.content.sha,
      externalUrl: canonicalUrl,
      resultMetadata: {
        commitUrl: result.commit.html_url,
        contentUrl: result.content.html_url,
      },
    });
    if (!completed) {
      return { ok: false, code: "conflict", message: "GitHub committed the file, but its local result needs reconciliation." };
    }
    await markPublicationVariantPublishedForUser({
      variantId: variant.id,
      userId: session.user.id,
      expectedRevision: variant.revision,
    });
    revalidatePath(`/articles/${article.id}/variants`);
    return { ok: true, operation, commitSha: result.commit.sha, canonicalUrl };
  } catch (error) {
    const providerError = error instanceof GitHubPublisherError ? error : null;
    await failPublicationForUser({
      publicationId: attempt.id,
      userId: session.user.id,
      errorCode: providerError?.code ?? "github_request_failed",
      resultMetadata: providerError?.requestId
        ? { requestId: providerError.requestId }
        : undefined,
    });
    return {
      ok: false,
      code: "provider",
      message: providerError?.message ?? "GitHub could not complete the publication request.",
    };
  }
}
