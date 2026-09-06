import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createLinkedInPublisher, LinkedInPublishError } from "./linkedin";

const options = {
  accessToken: "access-token",
  authorUrn: "urn:li:person:123456",
  apiVersion: "202608",
};

describe("LinkedIn member publisher", () => {
  it("creates an immediate public member post through the versioned Posts API", async () => {
    const request = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer access-token",
        "Linkedin-Version": "202608",
        "X-Restli-Protocol-Version": "2.0.0",
      });
      expect(JSON.parse(String(init?.body))).toMatchObject({
        author: "urn:li:person:123456",
        commentary: "A deliberate post",
        visibility: "PUBLIC",
        lifecycleState: "PUBLISHED",
      });
      return new Response(null, { status: 201, headers: { "x-restli-id": "urn:li:share:987654" } });
    });
    const publisher = createLinkedInPublisher({ ...options, fetch: request as typeof fetch });
    await expect(publisher.publishText("A deliberate post"))
      .resolves.toEqual({ postId: "urn:li:share:987654" });
    expect(request).toHaveBeenCalledWith("https://api.linkedin.com/rest/posts", expect.objectContaining({ method: "POST" }));
  });

  it("rejects empty and oversized commentary before a request", async () => {
    const request = vi.fn();
    const publisher = createLinkedInPublisher({ ...options, fetch: request as typeof fetch });
    await expect(publisher.publishText(" ")).rejects.toEqual(expect.objectContaining<Partial<LinkedInPublishError>>({ code: "invalid_request" }));
    await expect(publisher.publishText("x".repeat(3_001))).rejects.toEqual(expect.objectContaining<Partial<LinkedInPublishError>>({ code: "invalid_request" }));
    expect(request).not.toHaveBeenCalled();
  });

  it.each([[401, "authentication"], [403, "permission"], [429, "rate_limit"], [500, "unavailable"]] as const)(
    "maps status %s to %s without leaking response data",
    async (status, code) => {
      const publisher = createLinkedInPublisher({
        ...options,
        fetch: vi.fn(async () => Response.json({ message: "provider detail" }, { status })) as typeof fetch,
      });
      await expect(publisher.publishText("Post"))
        .rejects.toEqual(expect.objectContaining<Partial<LinkedInPublishError>>({ code }));
    },
  );

  it("requires a validated post identity header", async () => {
    const publisher = createLinkedInPublisher({
      ...options,
      fetch: vi.fn(async () => new Response(null, { status: 201 })) as typeof fetch,
    });
    await expect(publisher.publishText("Post"))
      .rejects.toEqual(expect.objectContaining<Partial<LinkedInPublishError>>({ code: "invalid_response" }));
  });
});
