import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createGitHubPublisher } from "./github";
import { websitePublicationOutputs } from "../website";

const token = process.env.GITHUB_LIVE_TEST_TOKEN;
const branch = process.env.GITHUB_LIVE_TEST_BRANCH;
const enabled = Boolean(token && branch?.startsWith("phase6-validation-"));

describe("GitHub publisher live validation", () => {
  it.skipIf(!enabled)("creates and updates the exact file on a disposable branch", async () => {
    const repository = "timbenniks/timbenniks-2026";
    const path = "src/content/writing/phase6-publisher-validation.md";
    const metadata = {
      title: "Phase 6 publisher validation",
      slug: "phase6-publisher-validation",
      description: "A disposable draft used to validate safe website publication.",
      date: "2026-09-06T08:00:00Z",
      image: "https://images.example.com/phase6-publisher-validation.png",
      tags: ["craft" as const],
      draft: true,
    };
    const publisher = createGitHubPublisher({
      token: token!,
      allowedRepositories: [repository],
    });

    expect(await publisher.inspectFile({ repository, path, branch })).toBeNull();
    const createdMarkdown = websitePublicationOutputs({
      metadata,
      plainText: "Create.",
      bodyMarkdown: "Create.",
    }).find(({ target }) => target === "timbenniks-2026")?.markdown;
    expect(createdMarkdown).toBeTruthy();
    const created = await publisher.writeFile({
      repository,
      path,
      branch,
      message: "Validate Phase 6 publisher create",
      markdown: createdMarkdown!,
    });
    expect(created.commit.sha).toMatch(/^[a-f0-9]{40}$/);

    const existing = await publisher.inspectFile({ repository, path, branch });
    expect(existing?.sha).toBe(created.content.sha);
    const updatedMarkdown = websitePublicationOutputs({
      metadata,
      plainText: "Update.",
      bodyMarkdown: "Update.",
    }).find(({ target }) => target === "timbenniks-2026")?.markdown;
    expect(updatedMarkdown).toBeTruthy();
    const updated = await publisher.writeFile({
      repository,
      path,
      branch,
      message: "Validate Phase 6 publisher update",
      markdown: updatedMarkdown!,
      expectedSha: existing?.sha,
    });
    expect(updated.commit.sha).not.toBe(created.commit.sha);
    expect(updated.content.sha).not.toBe(created.content.sha);
  });
});
