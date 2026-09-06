import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ButtondownError, createButtondownAdapter } from "./buttondown";

describe("Buttondown draft adapter", () => {
  it("creates an explicit draft with a server credential", async () => {
    const request = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ Authorization: "Token secret-key" });
      expect(JSON.parse(String(init?.body))).toEqual({
        subject: "Newsletter subject",
        body: "Newsletter body",
        status: "draft",
      });
      return Response.json({ id: "draft-id", status: "draft", subject: "Newsletter subject" });
    });
    const adapter = createButtondownAdapter({ apiKey: "secret-key", fetch: request as typeof fetch });
    await expect(adapter.createDraft({ subject: "Newsletter subject", body: "Newsletter body" }))
      .resolves.toEqual({ id: "draft-id", status: "draft", subject: "Newsletter subject" });
    expect(request).toHaveBeenCalledWith("https://api.buttondown.com/v1/emails", expect.objectContaining({ method: "POST" }));
  });

  it("rejects invalid content before making a request", async () => {
    const request = vi.fn();
    const adapter = createButtondownAdapter({ apiKey: "secret-key", fetch: request as typeof fetch });
    await expect(adapter.createDraft({ subject: "", body: "Body" }))
      .rejects.toEqual(expect.objectContaining<Partial<ButtondownError>>({ code: "invalid_request" }));
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    [401, "authentication"],
    [429, "rate_limit"],
    [500, "unavailable"],
  ] as const)("maps status %s to a bounded %s error", async (status, code) => {
    const adapter = createButtondownAdapter({
      apiKey: "secret-key",
      fetch: vi.fn(async () => Response.json({ detail: "provider secret" }, { status })) as typeof fetch,
    });
    await expect(adapter.createDraft({ subject: "Subject", body: "Body" }))
      .rejects.toEqual(expect.objectContaining<Partial<ButtondownError>>({ code }));
  });

  it("rejects a non-draft provider response", async () => {
    const adapter = createButtondownAdapter({
      apiKey: "secret-key",
      fetch: vi.fn(async () => Response.json({ id: "sent-id", status: "sent", subject: "Subject" })) as typeof fetch,
    });
    await expect(adapter.createDraft({ subject: "Subject", body: "Body" }))
      .rejects.toEqual(expect.objectContaining<Partial<ButtondownError>>({ code: "invalid_response" }));
  });
});
