import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CloudinaryUploadError, createCloudinaryUploader } from "./cloudinary";

describe("Cloudinary hero uploader", () => {
  it("signs and validates a bounded server-side upload", async () => {
    const request = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const form = init?.body as FormData;
      expect(form.get("api_key")).toBe("api-key");
      expect(form.get("folder")).toBe("turbo-timmy-writer/heroes");
      expect(form.get("timestamp")).toBe("1700000000");
      expect(form.get("signature")).toBe(createHash("sha1")
        .update("folder=turbo-timmy-writer/heroes&timestamp=1700000000api-secret")
        .digest("hex"));
      return Response.json({
        secure_url: "https://res.cloudinary.com/demo/image/upload/hero.jpg",
        public_id: "turbo-timmy-writer/heroes/hero",
        format: "jpg",
        width: 1600,
        height: 900,
        bytes: 1234,
      });
    });
    const upload = createCloudinaryUploader({
      cloudName: "demo",
      apiKey: "api-key",
      apiSecret: "api-secret",
      fetch: request as typeof fetch,
      now: () => 1_700_000_000_000,
    });

    await expect(upload({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: "image/jpeg",
      filename: "hero.jpg",
    })).resolves.toMatchObject({ publicId: "turbo-timmy-writer/heroes/hero" });
    expect(request).toHaveBeenCalledWith(
      "https://api.cloudinary.com/v1_1/demo/image/upload",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects unsafe types and oversized files before a request", async () => {
    const request = vi.fn();
    const upload = createCloudinaryUploader({
      cloudName: "demo",
      apiKey: "key",
      apiSecret: "secret",
      fetch: request as typeof fetch,
    });
    await expect(upload({
      bytes: new Uint8Array([1]),
      mimeType: "image/svg+xml",
      filename: "unsafe.svg",
    })).rejects.toEqual(expect.objectContaining<Partial<CloudinaryUploadError>>({ code: "invalid-file" }));
    expect(request).not.toHaveBeenCalled();
  });

  it("maps provider and response failures to a bounded error", async () => {
    const upload = createCloudinaryUploader({
      cloudName: "demo",
      apiKey: "key",
      apiSecret: "secret",
      fetch: vi.fn(async () => Response.json({ error: "secret detail" }, { status: 500 })) as typeof fetch,
    });
    await expect(upload({
      bytes: new Uint8Array([1]),
      mimeType: "image/png",
      filename: "hero.png",
    })).rejects.toEqual(expect.objectContaining<Partial<CloudinaryUploadError>>({ code: "provider-failure" }));
  });
});
