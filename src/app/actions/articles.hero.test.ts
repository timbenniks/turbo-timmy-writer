import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAllowedSession: vi.fn(),
  updateArticleHeroImageForUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/auth/session", () => ({ getAllowedSession: mocks.getAllowedSession }));
vi.mock("@/db/queries/articles", () => ({
  createBlankArticleForUser: vi.fn(),
  saveArticleForUser: vi.fn(),
  updateArticleHeroImageForUser: mocks.updateArticleHeroImageForUser,
}));
vi.mock("@/db/queries/writing-sessions", () => ({ createArticleStartForUser: vi.fn() }));

import { updateArticleHeroImageAction } from "./articles";

const validInput = {
  articleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  expectedRevision: 3,
  heroImage: {
    url: "https://images.example.com/hero.jpg",
    alt: "A useful hero image",
  },
};

describe("updateArticleHeroImageAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllowedSession.mockResolvedValue({ user: { id: "user-id" } });
  });

  it("fails closed without a session or valid external image", async () => {
    mocks.getAllowedSession.mockResolvedValueOnce(null);
    await expect(updateArticleHeroImageAction(validInput)).resolves.toMatchObject({
      ok: false,
      code: "unauthorized",
    });
    await expect(updateArticleHeroImageAction({
      ...validInput,
      heroImage: { url: "file:///secret", alt: "" },
    })).resolves.toMatchObject({ ok: false, code: "invalid" });
    expect(mocks.updateArticleHeroImageForUser).not.toHaveBeenCalled();
  });

  it("reports missing ownership and stale revisions safely", async () => {
    mocks.updateArticleHeroImageForUser.mockResolvedValueOnce(null);
    await expect(updateArticleHeroImageAction(validInput)).resolves.toMatchObject({
      ok: false,
      code: "not-found",
    });

    mocks.updateArticleHeroImageForUser.mockResolvedValueOnce({
      status: "conflict",
      currentRevision: 4,
    });
    await expect(updateArticleHeroImageAction(validInput)).resolves.toMatchObject({
      ok: false,
      code: "conflict",
      currentRevision: 4,
    });
  });

  it("returns the advanced revision and revalidates the owned article", async () => {
    const updatedAt = new Date("2026-09-06T10:00:00Z");
    mocks.updateArticleHeroImageForUser.mockResolvedValueOnce({
      status: "updated",
      article: { revision: 4, updatedAt },
    });

    await expect(updateArticleHeroImageAction(validInput)).resolves.toEqual({
      ok: true,
      revision: 4,
      savedAt: updatedAt.toISOString(),
      heroImage: validInput.heroImage,
    });
    expect(mocks.updateArticleHeroImageForUser).toHaveBeenCalledWith({
      ...validInput,
      userId: "user-id",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/articles/${validInput.articleId}`);
  });
});
