import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAllowedSession: vi.fn(),
  getArticle: vi.fn(),
  getVariant: vi.fn(),
  latest: vi.fn(),
  createPending: vi.fn(),
  succeed: vi.fn(),
  fail: vi.fn(),
  markPublished: vi.fn(),
  inspectFile: vi.fn(),
  writeFile: vi.fn(),
  readEnvironment: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/auth/session", () => ({ getAllowedSession: mocks.getAllowedSession }));
vi.mock("@/db/queries/articles", () => ({ getArticleForUser: mocks.getArticle }));
vi.mock("@/db/queries/publications", () => ({
  createPendingPublicationForUser: mocks.createPending,
  failPublicationForUser: mocks.fail,
  latestSuccessfulPublicationForTarget: mocks.latest,
  succeedPublicationForUser: mocks.succeed,
}));
vi.mock("@/db/queries/publication-variants", () => ({
  getPublicationVariantForUser: mocks.getVariant,
  markPublicationVariantPublishedForUser: mocks.markPublished,
  savePublicationVariantForUser: vi.fn(),
}));
vi.mock("@/lib/env/server", () => ({
  readGitHubPublisherEnvironment: mocks.readEnvironment,
}));
vi.mock("@/publishing/adapters/github", async () => {
  const actual = await vi.importActual<typeof import("@/publishing/adapters/github")>(
    "@/publishing/adapters/github",
  );
  return {
    GitHubPublisherError: actual.GitHubPublisherError,
    createGitHubPublisher: () => ({
      inspectFile: mocks.inspectFile,
      writeFile: mocks.writeFile,
    }),
  };
});

import { publishWebsiteVariantAction } from "./publication-variants";

const articleId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";

const article = {
  id: articleId,
  revision: 4,
  title: "A story",
  documentJson: {
    type: "doc" as const,
    content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "Body" }] }],
  },
};

const variant = {
  id: variantId,
  articleId,
  revision: 3,
  destination: "website" as const,
  status: "ready" as const,
  sourceArticleRevision: article.revision,
  sourceContentHash: "",
  contentJson: {
    version: 1 as const,
    destination: "website" as const,
    bodyMarkdown: "Body",
  },
  metadataJson: {
    version: 1 as const,
    destination: "website" as const,
    title: "A story",
    slug: "a-story",
    description: "A useful story.",
    canonicalUrl: null,
    publicationDate: "2026-09-06T08:00:00Z",
    imageUrl: "https://images.example.com/a-story.png",
    tags: ["craft" as const],
  },
};

describe("website publication action", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { hashCanonicalArticle } = await import("@/variants/hashing");
    variant.sourceContentHash = hashCanonicalArticle(article);
    mocks.getAllowedSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getArticle.mockResolvedValue(article);
    mocks.getVariant.mockResolvedValue(variant);
    mocks.readEnvironment.mockReturnValue({ token: "secret", branch: "main" });
    mocks.latest.mockResolvedValue(null);
    mocks.inspectFile.mockResolvedValue(null);
    mocks.createPending.mockResolvedValue({ id: "33333333-3333-4333-8333-333333333333" });
    mocks.writeFile.mockResolvedValue({
      content: { sha: "a".repeat(40), html_url: "https://github.com/content" },
      commit: { sha: "b".repeat(40), html_url: "https://github.com/commit" },
    });
    mocks.succeed.mockResolvedValue({ id: "attempt", completedAt: new Date() });
    mocks.markPublished.mockResolvedValue({ id: variantId });
  });

  it("requires explicit confirmation before reading publication state", async () => {
    await expect(publishWebsiteVariantAction({
      articleId,
      variantId,
      expectedRevision: 3,
      target: "timbenniksdev-2024",
      confirmed: false,
    })).resolves.toMatchObject({ ok: false, code: "invalid" });
    expect(mocks.getVariant).not.toHaveBeenCalled();
  });

  it("creates and records an exact confirmed publication", async () => {
    await expect(publishWebsiteVariantAction({
      articleId,
      variantId,
      expectedRevision: 3,
      target: "timbenniksdev-2024",
      confirmed: true,
    })).resolves.toEqual({
      ok: true,
      operation: "create",
      commitSha: "b".repeat(40),
      canonicalUrl: "https://timbenniks.dev/writing/a-story",
    });
    expect(mocks.createPending).toHaveBeenCalledWith(expect.objectContaining({
      target: "timbenniksdev-2024",
      operation: "create",
      expectedBlobSha: null,
      expectedArticleRevision: 4,
      sourceContentHash: variant.sourceContentHash,
      markdownSnapshot: expect.stringContaining("canonical_url"),
    }));
    expect(mocks.succeed).toHaveBeenCalledWith(expect.objectContaining({
      commitSha: "b".repeat(40),
      blobSha: "a".repeat(40),
      externalUrl: "https://timbenniks.dev/writing/a-story",
    }));
    expect(mocks.markPublished).toHaveBeenCalled();
  });

  it("uses the inspected SHA for an update", async () => {
    mocks.inspectFile.mockResolvedValue({ sha: "c".repeat(40) });

    await publishWebsiteVariantAction({
      articleId,
      variantId,
      expectedRevision: 3,
      target: "timbenniks-2026",
      confirmed: true,
    });

    expect(mocks.createPending).toHaveBeenCalledWith(expect.objectContaining({
      operation: "update",
      expectedBlobSha: "c".repeat(40),
    }));
    expect(mocks.writeFile).toHaveBeenCalledWith(expect.objectContaining({
      expectedSha: "c".repeat(40),
    }));
  });

  it("blocks stale variants before inspecting GitHub", async () => {
    mocks.getArticle.mockResolvedValue({ ...article, revision: 5 });

    await expect(publishWebsiteVariantAction({
      articleId,
      variantId,
      expectedRevision: 3,
      target: "timbenniksdev-2024",
      confirmed: true,
    })).resolves.toMatchObject({ ok: false, code: "stale" });
    expect(mocks.inspectFile).not.toHaveBeenCalled();
  });

  it("records a bounded failed attempt for safe retry", async () => {
    mocks.writeFile.mockRejectedValue(new Error("secret upstream response"));

    await expect(publishWebsiteVariantAction({
      articleId,
      variantId,
      expectedRevision: 3,
      target: "timbenniksdev-2024",
      confirmed: true,
    })).resolves.toEqual({
      ok: false,
      code: "provider",
      message: "GitHub could not complete the publication request.",
    });
    expect(mocks.fail).toHaveBeenCalledWith(expect.objectContaining({
      errorCode: "github_request_failed",
    }));
  });
});
