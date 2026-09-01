import { describe, expect, it } from "vitest";

import {
  articleDisplayTitle,
  articleIdSchema,
  canTransitionArticleStatus,
  statusesForLibraryFilter,
  untitledArticleSlug,
} from "./model";

describe("article lifecycle", () => {
  it("allows deliberate forward, archive, and restore transitions", () => {
    expect(canTransitionArticleStatus("idea", "drafting")).toBe(true);
    expect(canTransitionArticleStatus("drafting", "published")).toBe(false);
    expect(canTransitionArticleStatus("ready", "published")).toBe(true);
    expect(canTransitionArticleStatus("published", "idea")).toBe(false);
    expect(canTransitionArticleStatus("archived", "editing")).toBe(true);
  });

  it("maps library views to explicit lifecycle states", () => {
    expect(statusesForLibraryFilter("drafts")).toEqual([
      "interviewing",
      "drafting",
      "editing",
      "ready",
    ]);
    expect(statusesForLibraryFilter("all")).not.toContain("archived");
    expect(statusesForLibraryFilter("archive")).toEqual(["archived"]);
  });
});

describe("blank articles", () => {
  it("uses a stable unique slug and a calm display fallback", () => {
    const id = "5b0f8636-fdeb-45f3-8a44-ddd326bea5c8";

    expect(untitledArticleSlug(id)).toBe(`untitled-${id}`);
    expect(articleDisplayTitle("   ")).toBe("Untitled article");
    expect(articleDisplayTitle(" A real title ")).toBe("A real title");
    expect(articleIdSchema.safeParse(id).success).toBe(true);
    expect(articleIdSchema.safeParse("not-an-id").success).toBe(false);
  });
});
