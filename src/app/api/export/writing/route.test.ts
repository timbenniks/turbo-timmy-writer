import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAllowedSession: vi.fn(),
  getPortableWritingBackupForUser: vi.fn(),
}));

vi.mock("@/auth/session", () => ({ getAllowedSession: mocks.getAllowedSession }));
vi.mock("@/db/queries/export", () => ({
  getPortableWritingBackupForUser: mocks.getPortableWritingBackupForUser,
}));

import { POST } from "./route";

function exportRequest(origin = "http://localhost:3001") {
  return new Request("http://localhost:3001/api/export/writing", {
    method: "POST",
    headers: { origin },
  });
}

describe("portable writing backup route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a cross-origin or missing Origin before authentication", async () => {
    await expect(POST(new Request("http://localhost:3001/api/export/writing", { method: "POST" })))
      .resolves.toMatchObject({ status: 403 });
    await expect(POST(exportRequest("https://example.com"))).resolves.toMatchObject({ status: 403 });
    expect(mocks.getAllowedSession).not.toHaveBeenCalled();
    expect(mocks.getPortableWritingBackupForUser).not.toHaveBeenCalled();
  });

  it("fails closed before querying backup data", async () => {
    mocks.getAllowedSession.mockResolvedValue(null);
    await expect(POST(exportRequest())).resolves.toMatchObject({ status: 401 });
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
    const response = await POST(exportRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="turbo-timmy-writer-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(mocks.getPortableWritingBackupForUser).toHaveBeenCalledWith("user-id", expect.any(Date));
    await expect(response.json()).resolves.toMatchObject({ schemaVersion: 2, scope: "writing" });
  });
});
