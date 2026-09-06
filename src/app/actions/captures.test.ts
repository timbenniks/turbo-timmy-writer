import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAllowedSession: vi.fn(),
  createQuickCaptureForUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/auth/session", () => ({ getAllowedSession: mocks.getAllowedSession }));
vi.mock("@/db/queries/articles", () => ({ createQuickCaptureForUser: mocks.createQuickCaptureForUser }));

import { createQuickCaptureAction } from "./captures";

function captureForm(body = "A useful fragment") {
  const form = new FormData();
  form.set("kind", "fragment");
  form.set("title", "");
  form.set("body", body);
  return form;
}

describe("createQuickCaptureAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAllowedSession.mockResolvedValue({ user: { id: "user-id" } });
  });

  it("fails closed and rejects empty capture text", async () => {
    mocks.getAllowedSession.mockResolvedValueOnce(null);
    await expect(createQuickCaptureAction({}, captureForm())).resolves.toEqual({ error: "Your session has expired." });
    await expect(createQuickCaptureAction({}, captureForm(""))).resolves.toHaveProperty("error");
    expect(mocks.createQuickCaptureForUser).not.toHaveBeenCalled();
  });

  it("creates an owner-scoped canonical idea entry", async () => {
    mocks.createQuickCaptureForUser.mockResolvedValue({ id: "article-id" });
    await expect(createQuickCaptureAction({}, captureForm())).resolves.toEqual({ createdId: "article-id" });
    expect(mocks.createQuickCaptureForUser).toHaveBeenCalledWith("user-id", {
      kind: "fragment",
      title: "",
      body: "A useful fragment",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/ideas");
  });
});
