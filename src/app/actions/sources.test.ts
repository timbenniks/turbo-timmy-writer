import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAllowedSession: vi.fn(),
  createArticleSourceForUser: vi.fn(),
  updateArticleSourceForUser: vi.fn(),
  removeArticleSourceForUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/auth/session", () => ({ getAllowedSession: mocks.getAllowedSession }));
vi.mock("@/db/queries/sources", () => ({
  createArticleSourceForUser: mocks.createArticleSourceForUser,
  updateArticleSourceForUser: mocks.updateArticleSourceForUser,
  removeArticleSourceForUser: mocks.removeArticleSourceForUser,
}));

import {
  createArticleSourceAction,
  removeArticleSourceAction,
  updateArticleSourceAction,
} from "./sources";

const articleId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sourceId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const source = { type: "webpage" as const, title: "Primary docs", url: "https://example.com" };
const link = { quote: "Supporting passage", context: "Opening", position: 0 };

describe("article source actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllowedSession.mockResolvedValue({ user: { id: "user-id" } });
  });

  it("fails closed before persistence", async () => {
    mocks.getAllowedSession.mockResolvedValueOnce(null);
    await expect(createArticleSourceAction({ articleId, source, link }))
      .resolves.toMatchObject({ ok: false, code: "unauthorized" });
    await expect(createArticleSourceAction({ articleId, source: { ...source, url: "file:///tmp" }, link }))
      .resolves.toMatchObject({ ok: false, code: "invalid" });
    expect(mocks.createArticleSourceForUser).not.toHaveBeenCalled();
  });

  it("creates an owner-scoped source link", async () => {
    mocks.createArticleSourceForUser.mockResolvedValue({ id: sourceId });
    await expect(createArticleSourceAction({ articleId, source, link }))
      .resolves.toEqual({ ok: true, sourceId });
    expect(mocks.createArticleSourceForUser).toHaveBeenCalledWith({
      articleId,
      source,
      link,
      userId: "user-id",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/articles/${articleId}`);
  });

  it("updates and unlinks only an owned article source", async () => {
    mocks.updateArticleSourceForUser.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(updateArticleSourceAction({ articleId, sourceId, source, link }))
      .resolves.toMatchObject({ ok: false, code: "not-found" });
    await expect(updateArticleSourceAction({ articleId, sourceId, source, link }))
      .resolves.toEqual({ ok: true });

    mocks.removeArticleSourceForUser.mockResolvedValue(true);
    await expect(removeArticleSourceAction({ articleId, sourceId }))
      .resolves.toEqual({ ok: true });
    expect(mocks.removeArticleSourceForUser).toHaveBeenCalledWith({
      articleId,
      sourceId,
      userId: "user-id",
    });
  });
});
