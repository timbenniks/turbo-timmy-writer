import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAllowedSession: vi.fn(),
  getArticle: vi.fn(),
  getVariant: vi.fn(),
  createPending: vi.fn(),
  succeed: vi.fn(),
  fail: vi.fn(),
  readEnvironment: vi.fn(),
  createDraft: vi.fn(),
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
  readButtondownEnvironment: mocks.readEnvironment,
}));
vi.mock("@/publishing/adapters/buttondown", async () => {
  const actual = await vi.importActual<typeof import("@/publishing/adapters/buttondown")>(
    "@/publishing/adapters/buttondown",
  );
  return {
    ButtondownError: actual.ButtondownError,
    createButtondownAdapter: () => ({ createDraft: mocks.createDraft }),
  };
});

import { ButtondownError } from "@/publishing/adapters/buttondown";
import { hashCanonicalArticle } from "@/variants/hashing";
import { createButtondownDraftAction } from "./deliveries";

const articleId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";
const article = {
  id: articleId,
  revision: 4,
  title: "Canonical title",
  documentJson: {
    type: "doc" as const,
    content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "Canonical body" }] }],
  },
};
const variant = {
  id: variantId,
  articleId,
  revision: 3,
  destination: "newsletter" as const,
  status: "ready" as const,
  sourceArticleRevision: article.revision,
  sourceContentHash: hashCanonicalArticle(article),
  contentJson: {
    version: 1 as const,
    destination: "newsletter" as const,
    bodyMarkdown: "Newsletter body",
    intro: "Intro",
    callToAction: "Read more",
  },
  metadataJson: {
    version: 1 as const,
    destination: "newsletter" as const,
    subject: "Newsletter subject",
    previewText: "Preview",
  },
};
const input = { articleId, variantId, expectedRevision: 3, confirmed: true };

describe("Buttondown draft orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllowedSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getArticle.mockResolvedValue(article);
    mocks.getVariant.mockResolvedValue(variant);
    mocks.readEnvironment.mockReturnValue({ apiKey: "secret" });
    mocks.createPending.mockResolvedValue({ id: "33333333-3333-4333-8333-333333333333" });
    mocks.createDraft.mockResolvedValue({ id: "buttondown-id", status: "draft", subject: "Newsletter subject" });
    mocks.succeed.mockResolvedValue({ id: "delivery-id" });
    mocks.fail.mockResolvedValue({ id: "delivery-id" });
  });

  it("requires confirmation before authentication or provider work", async () => {
    await expect(createButtondownDraftAction({ ...input, confirmed: false }))
      .resolves.toMatchObject({ ok: false });
    expect(mocks.getAllowedSession).not.toHaveBeenCalled();
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });

  it("persists the exact pending snapshot before creating a provider draft", async () => {
    await expect(createButtondownDraftAction(input)).resolves.toEqual({
      ok: true,
      message: "Buttondown draft created. Nothing was sent.",
      externalId: "buttondown-id",
    });
    expect(mocks.createPending).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-1",
      provider: "buttondown",
      operation: "create-draft",
      expectedVariantRevision: 3,
      snapshot: expect.objectContaining({
        subject: "Newsletter subject",
        body: "Intro\n\nNewsletter body\n\nRead more",
      }),
      snapshotHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(mocks.createDraft).toHaveBeenCalledWith({
      subject: "Newsletter subject",
      body: "Intro\n\nNewsletter body\n\nRead more",
    });
    expect(mocks.succeed).toHaveBeenCalledWith(expect.objectContaining({
      externalId: "buttondown-id",
    }));
  });

  it("records a sanitized terminal failure", async () => {
    mocks.createDraft.mockRejectedValue(new ButtondownError("authentication"));
    await expect(createButtondownDraftAction(input)).resolves.toEqual({
      ok: false,
      message: "Buttondown rejected the configured credential.",
    });
    expect(mocks.fail).toHaveBeenCalledWith(expect.objectContaining({
      errorCode: "authentication",
    }));
    expect(mocks.succeed).not.toHaveBeenCalled();
  });

  it("makes no provider call when the atomic audit guard refuses", async () => {
    mocks.createPending.mockResolvedValue(null);
    await expect(createButtondownDraftAction(input)).resolves.toMatchObject({ ok: false });
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });
});
