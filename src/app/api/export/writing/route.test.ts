import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAllowedSession: vi.fn(),
  getPortableWritingBackupForUser: vi.fn(),
}));

vi.mock("@/auth/session", () => ({ getAllowedSession: mocks.getAllowedSession }));
vi.mock("@/db/queries/export", () => ({
  getPortableWritingBackupForUser: mocks.getPortableWritingBackupForUser,
}));

import { GET } from "./route";

describe("portable writing backup route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fails closed before querying backup data", async () => {
    mocks.getAllowedSession.mockResolvedValue(null);
    await expect(GET()).resolves.toMatchObject({ status: 401 });
    expect(mocks.getPortableWritingBackupForUser).not.toHaveBeenCalled();
  });

  it("returns an owner-only uncached JSON attachment", async () => {
    mocks.getAllowedSession.mockResolvedValue({ user: { id: "user-id" } });
    mocks.getPortableWritingBackupForUser.mockImplementation(async (_userId: string, exportedAt: Date) => ({
      schemaVersion: 2,
      exportedAt: exportedAt.toISOString(),
      scope: "writing",
      articles: [],
      articleVersions: [],
      publicationVariants: [],
      publications: [],
    }));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="turbo-timmy-writer-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(mocks.getPortableWritingBackupForUser).toHaveBeenCalledWith("user-id", expect.any(Date));
    await expect(response.json()).resolves.toMatchObject({ schemaVersion: 2, scope: "writing" });
  });
});
