import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createGitHubPublisher } from "./github";

const token = process.env.GITHUB_LIVE_TEST_TOKEN;
const branch = process.env.GITHUB_LIVE_TEST_BRANCH;
const enabled = Boolean(token && branch?.startsWith("phase6-validation-"));

describe("GitHub publisher live validation", () => {
  it.skipIf(!enabled)("creates and updates the exact file on a disposable branch", async () => {
    const repository = "timbenniks/timbenniks-2026";
    const path = "src/content/writing/phase6-publisher-validation.md";
    const publisher = createGitHubPublisher({
      token: token!,
      allowedRepositories: [repository],
    });

    expect(await publisher.inspectFile({ repository, path, branch })).toBeNull();
    const created = await publisher.writeFile({
      repository,
      path,
      branch,
      message: "Validate Phase 6 publisher create",
      markdown: "---\ntitle: Phase 6 validation\ndraft: true\n---\n\nCreate.\n",
    });
    expect(created.commit.sha).toMatch(/^[a-f0-9]{40}$/);

    const existing = await publisher.inspectFile({ repository, path, branch });
    expect(existing?.sha).toBe(created.content.sha);
    const updated = await publisher.writeFile({
      repository,
      path,
      branch,
      message: "Validate Phase 6 publisher update",
      markdown: "---\ntitle: Phase 6 validation\ndraft: true\n---\n\nUpdate.\n",
      expectedSha: existing?.sha,
    });
    expect(updated.commit.sha).not.toBe(created.commit.sha);
    expect(updated.content.sha).not.toBe(created.content.sha);
  });
});
