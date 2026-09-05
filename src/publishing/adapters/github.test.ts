import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let createGitHubPublisher: typeof import("./github").createGitHubPublisher;

beforeAll(async () => {
  ({ createGitHubPublisher } = await import("./github"));
});

const sha = "a".repeat(40);
const commitSha = "b".repeat(40);

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function publisher(fetchMock: typeof fetch) {
  return createGitHubPublisher({
    token: "test-token",
    allowedRepositories: [
      "timbenniks/timbenniksdev-2024",
      "timbenniks/timbenniks-2026",
    ],
    fetch: fetchMock,
  });
}

describe("GitHub publisher adapter", () => {
  it("inspects the configured branch and treats a missing file as a create", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({
        type: "file",
        path: "content/4.writing/a-story.md",
        sha,
        html_url: "https://github.com/timbenniks/timbenniksdev-2024/blob/main/content/4.writing/a-story.md",
      }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const adapter = publisher(fetchMock);

    await expect(adapter.inspectFile({
      repository: "timbenniks/timbenniksdev-2024",
      path: "content/4.writing/a-story.md",
    })).resolves.toMatchObject({ sha });
    await expect(adapter.inspectFile({
      repository: "timbenniks/timbenniks-2026",
      path: "src/content/writing/new-story.md",
      branch: "preview",
    })).resolves.toBeNull();

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.github.com/repos/timbenniks/timbenniksdev-2024/contents/content/4.writing/a-story.md?ref=main",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toContain("?ref=preview");
  });

  it("creates UTF-8 content without an update SHA", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      content: {
        path: "src/content/writing/cafe.md",
        sha,
        html_url: "https://github.com/timbenniks/timbenniks-2026/blob/main/src/content/writing/cafe.md",
      },
      commit: {
        sha: commitSha,
        html_url: `https://github.com/timbenniks/timbenniks-2026/commit/${commitSha}`,
      },
    }, { status: 201 }));
    const adapter = publisher(fetchMock);

    await expect(adapter.writeFile({
      repository: "timbenniks/timbenniks-2026",
      path: "src/content/writing/cafe.md",
      message: "Publish café",
      markdown: "# Café ☕",
    })).resolves.toMatchObject({ commit: { sha: commitSha } });

    const init = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(init?.method).toBe("PUT");
    expect(body).toEqual({
      message: "Publish café",
      content: Buffer.from("# Café ☕", "utf8").toString("base64"),
      branch: "main",
    });
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("updates only with the caller's expected file SHA", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      content: { path: "content/4.writing/a.md", sha, html_url: null },
      commit: {
        sha: commitSha,
        html_url: `https://github.com/timbenniks/timbenniksdev-2024/commit/${commitSha}`,
      },
    }));
    const adapter = publisher(fetchMock);

    await adapter.writeFile({
      repository: "timbenniks/timbenniksdev-2024",
      path: "content/4.writing/a.md",
      message: "Update a",
      markdown: "Updated",
      expectedSha: sha,
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body.sha).toBe(sha);
  });

  it("rejects unconfigured repositories and unsafe paths before fetch", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const adapter = publisher(fetchMock);

    await expect(adapter.inspectFile({
      repository: "someone/else",
      path: "content/article.md",
    })).rejects.toMatchObject({ code: "forbidden_repository" });
    await expect(adapter.writeFile({
      repository: "timbenniks/timbenniksdev-2024",
      path: "../secret",
      message: "Nope",
      markdown: "Nope",
    })).rejects.toMatchObject({ code: "invalid_request" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps concurrency and provider failures without exposing response bodies", async () => {
    const conflict = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ message: "sensitive upstream detail" }),
      {
        status: 409,
        headers: { "x-github-request-id": "request-123" },
      },
    ));
    const adapter = publisher(conflict);

    await expect(adapter.writeFile({
      repository: "timbenniks/timbenniksdev-2024",
      path: "content/4.writing/a.md",
      message: "Update a",
      markdown: "Updated",
      expectedSha: sha,
    })).rejects.toMatchObject({
      code: "github_conflict",
      status: 409,
      requestId: "request-123",
      message: "The repository changed before this publication could be committed.",
    });
  });

  it("rejects malformed success responses", async () => {
    const adapter = publisher(vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ content: null, commit: { sha: "not-a-sha" } }),
    ));

    await expect(adapter.writeFile({
      repository: "timbenniks/timbenniksdev-2024",
      path: "content/4.writing/a.md",
      message: "Publish a",
      markdown: "Body",
    })).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("maps timeouts to a safe provider error", async () => {
    const timeout = vi.fn<typeof fetch>().mockRejectedValue(
      new DOMException("upstream detail", "TimeoutError"),
    );
    const adapter = publisher(timeout);

    await expect(adapter.inspectFile({
      repository: "timbenniks/timbenniksdev-2024",
      path: "content/4.writing/a.md",
    })).rejects.toMatchObject({
      code: "github_timeout",
      message: "GitHub did not respond in time.",
    });
  });
});
