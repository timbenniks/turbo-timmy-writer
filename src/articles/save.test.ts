import { describe, expect, it } from "vitest";

import { emptyArticleDocument } from "@/editor/document";

import { hasChangesAfterSaveStarted, saveArticleInputSchema } from "./save";

const validSave = {
  articleId: "5b0f8636-fdeb-45f3-8a44-ddd326bea5c8",
  documentVersion: 1,
  expectedRevision: 4,
  title: "A title",
  documentJson: emptyArticleDocument,
};

describe("article save contracts", () => {
  it("requires the server revision the editor opened from", () => {
    expect(saveArticleInputSchema.safeParse(validSave).success).toBe(true);
    expect(
      saveArticleInputSchema.safeParse({ ...validSave, expectedRevision: 0 }).success,
    ).toBe(false);
    expect(
      saveArticleInputSchema.safeParse({
        ...validSave,
        expectedRevision: undefined,
      }).success,
    ).toBe(false);
  });

  it("does not treat a late acknowledgement as saving newer local work", () => {
    expect(hasChangesAfterSaveStarted(7, 7)).toBe(false);
    expect(hasChangesAfterSaveStarted(7, 8)).toBe(true);
  });
});
