import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAllowedSession: vi.fn(),
  getBackup: vi.fn(),
  readEnvironment: vi.fn(),
  inspectFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/session", () => ({ getAllowedSession: mocks.getAllowedSession }));
vi.mock("@/db/queries/export", () => ({
  getPortableWritingBackupForUser: mocks.getBackup,
}));
vi.mock("@/lib/env/server", () => ({
  readGitHubBackupEnvironment: mocks.readEnvironment,
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

import { deliverWritingBackupToGitHubAction } from "./writing-backup";

const environment = {
  token: "secret",
  repository: "timbenniks/private-backups",
  path: "turbo-timmy-writer/latest.json",
  branch: "main",
};

describe("GitHub writing backup delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllowedSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.readEnvironment.mockReturnValue(environment);
    mocks.getBackup.mockResolvedValue({ schemaVersion: 1, scope: "writing", articles: [] });
    mocks.inspectFile.mockResolvedValue({ sha: "a".repeat(40) });
    mocks.writeFile.mockResolvedValue({ commit: { html_url: "https://github.com/commit" } });
  });

  it("requires explicit confirmation before authentication or export", async () => {
    await expect(deliverWritingBackupToGitHubAction({ confirmed: false }))
      .resolves.toMatchObject({ ok: false });
    expect(mocks.getAllowedSession).not.toHaveBeenCalled();
    expect(mocks.getBackup).not.toHaveBeenCalled();
  });

  it("fails closed before export when the session is missing", async () => {
    mocks.getAllowedSession.mockResolvedValue(null);
    await expect(deliverWritingBackupToGitHubAction({ confirmed: true }))
      .resolves.toMatchObject({ ok: false, message: "Your session has expired." });
    expect(mocks.getBackup).not.toHaveBeenCalled();
  });

  it("writes the owner-only snapshot with optimistic file concurrency", async () => {
    await expect(deliverWritingBackupToGitHubAction({ confirmed: true }))
      .resolves.toEqual({
        ok: true,
        message: "Private writing backup committed to GitHub.",
        url: "https://github.com/commit",
      });
    expect(mocks.getBackup).toHaveBeenCalledWith("user-1", expect.any(Date));
    expect(mocks.inspectFile).toHaveBeenCalledWith({
      repository: environment.repository,
      path: environment.path,
      branch: environment.branch,
    });
    expect(mocks.writeFile).toHaveBeenCalledWith(expect.objectContaining({
      repository: environment.repository,
      path: environment.path,
      branch: "main",
      expectedSha: "a".repeat(40),
      content: expect.stringContaining('"schemaVersion": 1'),
    }));
  });

  it("does not export when backup delivery is not configured", async () => {
    mocks.readEnvironment.mockReturnValue(null);
    await expect(deliverWritingBackupToGitHubAction({ confirmed: true }))
      .resolves.toMatchObject({ ok: false, message: "GitHub backup delivery is not configured." });
    expect(mocks.getBackup).not.toHaveBeenCalled();
  });
});
