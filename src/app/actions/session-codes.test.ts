import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAllowedSession: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/auth/session", () => ({ getAllowedSession: mocks.getAllowedSession }));
vi.mock("@/db/queries/article-versions", () => ({ restoreArticleVersionForUser: vi.fn() }));
vi.mock("@/db/queries/article-organization", () => ({
  createManualCheckpointForUser: vi.fn(),
  createTaxonomyTagForUser: vi.fn(),
  deleteTaxonomyTagForUser: vi.fn(),
  listTaxonomyTagsForUser: vi.fn(),
  renameTaxonomyTagForUser: vi.fn(),
  updateArticleStatusForUser: vi.fn(),
  updateArticleTagsForUser: vi.fn(),
}));

import { createManualCheckpointAction } from "./article-organization";
import { restoreArticleVersionAction } from "./article-versions";

describe("expired session codes", () => {
  beforeEach(() => {
    mocks.getAllowedSession.mockResolvedValue(null);
  });

  it("does not report an expired restore session as a missing version", async () => {
    await expect(restoreArticleVersionAction({
      articleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      versionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      expectedRevision: 1,
    })).resolves.toMatchObject({
      ok: false,
      code: "unauthorized",
      message: "Your session has expired.",
    });
  });

  it("does not report an expired checkpoint session as a missing article", async () => {
    await expect(createManualCheckpointAction({
      articleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      expectedRevision: 1,
    })).resolves.toMatchObject({
      ok: false,
      code: "unauthorized",
      message: "Your session has expired.",
    });
  });
});
