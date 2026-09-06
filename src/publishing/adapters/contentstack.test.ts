import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ContentstackError, createContentstackDraftAdapter } from "./contentstack";

const options = {
  apiHost: "https://eu-api.contentstack.com",
  apiKey: "stack-key",
  managementToken: "management-token",
  contentTypeUid: "developers_article",
  locale: "en-US",
  branch: "main",
};

describe("Contentstack draft adapter", () => {
  it("creates an un-published entry through the configured CMA boundary", async () => {
    const request = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        api_key: "stack-key",
        authorization: "management-token",
        branch: "main",
      });
      expect(JSON.parse(String(init?.body))).toEqual({ entry: { title: "Article", body: "Draft body" } });
      return Response.json({ entry: { uid: "entry-uid", title: "Article", _version: 1 } });
    });
    const adapter = createContentstackDraftAdapter({ ...options, fetch: request as typeof fetch });
    await expect(adapter.createDraft({ title: "Article", body: "Draft body" }))
      .resolves.toEqual({ uid: "entry-uid", title: "Article", _version: 1 });
    expect(request).toHaveBeenCalledWith(
      "https://eu-api.contentstack.com/v3/content_types/developers_article/entries?locale=en-us",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects unsafe field shapes and oversized content before a request", async () => {
    const request = vi.fn();
    const adapter = createContentstackDraftAdapter({ ...options, fetch: request as typeof fetch });
    await expect(adapter.createDraft([])).rejects.toEqual(expect.objectContaining<Partial<ContentstackError>>({ code: "invalid_request" }));
    await expect(adapter.createDraft({ body: "x".repeat(500_001) })).rejects.toEqual(expect.objectContaining<Partial<ContentstackError>>({ code: "invalid_request" }));
    expect(request).not.toHaveBeenCalled();
  });

  it.each([[401, "authentication"], [412, "authentication"], [429, "rate_limit"], [500, "unavailable"]] as const)(
    "maps status %s to %s without leaking provider detail",
    async (status, code) => {
      const adapter = createContentstackDraftAdapter({
        ...options,
        fetch: vi.fn(async () => Response.json({ error_message: "sensitive detail" }, { status })) as typeof fetch,
      });
      await expect(adapter.createDraft({ title: "Article" }))
        .rejects.toEqual(expect.objectContaining<Partial<ContentstackError>>({ code }));
    },
  );

  it("validates the returned entry identity", async () => {
    const adapter = createContentstackDraftAdapter({
      ...options,
      fetch: vi.fn(async () => Response.json({ entry: { title: "Missing UID" } })) as typeof fetch,
    });
    await expect(adapter.createDraft({ title: "Article" }))
      .rejects.toEqual(expect.objectContaining<Partial<ContentstackError>>({ code: "invalid_response" }));
  });
});
