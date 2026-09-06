import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAllowedSession: vi.fn(),
  getArticle: vi.fn(),
  getVariant: vi.fn(),
  createPending: vi.fn(),
  succeed: vi.fn(),
  fail: vi.fn(),
  readLinkedInEnvironment: vi.fn(),
  publishText: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/session", () => ({ getAllowedSession: mocks.getAllowedSession }));
vi.mock("@/db/queries/articles", () => ({ getArticleForUser: mocks.getArticle }));
vi.mock("@/db/queries/publication-variants", () => ({
  getPublicationVariantForUser: mocks.getVariant,
}));
vi.mock("@/db/queries/deliveries", () => ({
  createPendingDeliveryForUser: mocks.createPending,
  succeedDeliveryForUser: mocks.succeed,
  failDeliveryForUser: mocks.fail,
}));
vi.mock("@/lib/env/server", () => ({
  readButtondownEnvironment: vi.fn(),
  readLinkedInEnvironment: mocks.readLinkedInEnvironment,
}));
vi.mock("@/publishing/adapters/linkedin", async () => {
  const actual = await vi.importActual<typeof import("@/publishing/adapters/linkedin")>(
    "@/publishing/adapters/linkedin",
  );
  return {
    LinkedInPublishError: actual.LinkedInPublishError,
    createLinkedInPublisher: () => ({ publishText: mocks.publishText }),
  };
});

import { LinkedInPublishError } from "@/publishing/adapters/linkedin";
import { hashCanonicalArticle } from "@/variants/hashing";
import { publishLinkedInPostAction } from "./deliveries";

const articleId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";
const article = {
  id: articleId,
  revision: 2,
  title: "Canonical title",
  documentJson: {
    type: "doc" as const,
    content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "Canonical body" }] }],
  },
};
const variant = {
  id: variantId,
  articleId,
  revision: 4,
  destination: "linkedin-post" as const,
  status: "ready" as const,
  sourceArticleRevision: article.revision,
  sourceContentHash: hashCanonicalArticle(article),
  contentJson: {
    version: 1 as const,
    destination: "linkedin-post" as const,
    bodyMarkdown: "A deliberate public post",
  },
  metadataJson: {
    version: 1 as const,
    destination: "linkedin-post" as const,
    publicationUrl: null,
  },
};
const input = { articleId, variantId, expectedRevision: 4, confirmed: true };

describe("audited LinkedIn publication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllowedSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getArticle.mockResolvedValue(article);
    mocks.getVariant.mockResolvedValue(variant);
    mocks.readLinkedInEnvironment.mockReturnValue({
      accessToken: "secret",
      authorUrn: "urn:li:person:123",
      apiVersion: "202608",
    });
    mocks.createPending.mockResolvedValue({ id: "33333333-3333-4333-8333-333333333333" });
    mocks.publishText.mockResolvedValue({ postId: "urn:li:share:456" });
    mocks.succeed.mockResolvedValue({ id: "delivery-id" });
    mocks.fail.mockResolvedValue({ id: "delivery-id" });
  });

  it("requires public-post confirmation before authentication or provider work", async () => {
    await expect(publishLinkedInPostAction({ ...input, confirmed: false }))
      .resolves.toMatchObject({ ok: false });
    expect(mocks.getAllowedSession).not.toHaveBeenCalled();
    expect(mocks.publishText).not.toHaveBeenCalled();
  });

  it("audits the exact public request before publishing", async () => {
    await expect(publishLinkedInPostAction(input)).resolves.toEqual({
      ok: true,
      message: "LinkedIn post published publicly.",
      externalId: "urn:li:share:456",
    });
    expect(mocks.createPending).toHaveBeenCalledWith(expect.objectContaining({
      provider: "linkedin",
      operation: "publish",
      destination: "linkedin-post",
      snapshot: expect.objectContaining({
        author: "urn:li:person:123",
        commentary: "A deliberate public post",
        visibility: "PUBLIC",
        lifecycleState: "PUBLISHED",
      }),
      snapshotHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(mocks.publishText).toHaveBeenCalledWith("A deliberate public post");
    expect(mocks.succeed).toHaveBeenCalledWith(expect.objectContaining({
      externalId: "urn:li:share:456",
    }));
  });

  it("stores a bounded provider failure", async () => {
    mocks.publishText.mockRejectedValue(new LinkedInPublishError("permission"));
    await expect(publishLinkedInPostAction(input)).resolves.toEqual({
      ok: false,
      message: "LinkedIn did not grant permission to publish this post.",
    });
    expect(mocks.fail).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "permission" }));
  });

  it("never calls LinkedIn after an atomic concurrency refusal", async () => {
    mocks.createPending.mockResolvedValue(null);
    await expect(publishLinkedInPostAction(input)).resolves.toMatchObject({ ok: false });
    expect(mocks.publishText).not.toHaveBeenCalled();
  });
});
