import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAllowedSession: vi.fn(),
  readCloudinaryEnvironment: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/session", () => ({ getAllowedSession: mocks.getAllowedSession }));
vi.mock("@/lib/env/server", () => ({
  readCloudinaryEnvironment: mocks.readCloudinaryEnvironment,
}));

import { POST } from "./route";

function testFile(contents: string, name: string, type: string) {
  const bytes = new TextEncoder().encode(contents);
  return {
    name,
    type,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer,
  } as File;
}

function uploadRequest(file: File) {
  return {
    formData: async () => ({ get: () => file }),
  } as unknown as Request;
}

describe("Cloudinary upload route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getAllowedSession.mockResolvedValue({ user: { id: "user-id" } });
    mocks.readCloudinaryEnvironment.mockReturnValue({
      cloudName: "demo",
      apiKey: "api-key",
      apiSecret: "api-secret",
    });
  });

  it("fails closed without an allowed session or complete configuration", async () => {
    mocks.getAllowedSession.mockResolvedValueOnce(null);
    await expect(POST(uploadRequest(testFile("image", "hero.png", "image/png"))))
      .resolves.toMatchObject({ status: 401 });

    mocks.readCloudinaryEnvironment.mockReturnValueOnce(null);
    await expect(POST(uploadRequest(testFile("image", "hero.png", "image/png"))))
      .resolves.toMatchObject({ status: 503 });
  });

  it("rejects unsupported files before contacting Cloudinary", async () => {
    const providerRequest = vi.spyOn(globalThis, "fetch");
    const response = await POST(uploadRequest(
      testFile("<svg></svg>", "hero.svg", "image/svg+xml"),
    ));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Choose a JPEG, PNG, WebP, AVIF, or GIF image up to 10 MB.",
    });
    expect(providerRequest).not.toHaveBeenCalled();
  });

  it("returns only the validated provider upload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({
      secure_url: "https://res.cloudinary.com/demo/image/upload/hero.png",
      public_id: "turbo-timmy-writer/heroes/hero",
      format: "png",
      width: 1600,
      height: 900,
      bytes: 5,
    }));
    const response = await POST(uploadRequest(
      testFile("image", "hero.png", "image/png"),
    ));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      upload: {
        url: "https://res.cloudinary.com/demo/image/upload/hero.png",
        publicId: "turbo-timmy-writer/heroes/hero",
        format: "png",
        width: 1600,
        height: 900,
        bytes: 5,
      },
    });
  });
});
