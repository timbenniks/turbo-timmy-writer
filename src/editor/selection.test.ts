import { Schema } from "@tiptap/pm/model";
import { AllSelection, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";

import {
  captureArticleSelection,
  findTextBookmark,
  MAX_AI_SELECTION_CHARACTERS,
} from "@/editor/selection";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*" },
    text: {},
  },
});

function articleDocument(...paragraphs: string[]) {
  return schema.node(
    "doc",
    undefined,
    paragraphs.map((text) => schema.node("paragraph", undefined, schema.text(text))),
  );
}

describe("captureArticleSelection", () => {
  it("captures exact text and a direction-aware bookmark", () => {
    const document = articleDocument("Alpha beta.");
    const selection = TextSelection.create(document, 6, 1);

    expect(captureArticleSelection(document, selection, 12)).toEqual({
      ok: true,
      selection: {
        documentVersion: 1,
        sourceRevision: 12,
        originalText: "Alpha",
        bookmark: { from: 1, to: 6, anchor: 6, head: 1 },
      },
    });
  });

  it("keeps block boundaries in multi-paragraph selections", () => {
    const document = articleDocument("Alpha", "Beta");
    const selection = TextSelection.create(document, 1, 12);

    const result = captureArticleSelection(document, selection, 3);

    expect(result.ok && result.selection.originalText).toBe("Alpha\nBeta");
  });

  it("rejects cursors, structural selections, and whitespace-only text", () => {
    const document = articleDocument("Alpha", "   ");

    expect(
      captureArticleSelection(document, TextSelection.create(document, 1), 1),
    ).toEqual({ ok: false, reason: "empty" });
    expect(captureArticleSelection(document, new AllSelection(document), 1)).toEqual({
      ok: false,
      reason: "not-text",
    });
    expect(
      captureArticleSelection(document, TextSelection.create(document, 8, 11), 1),
    ).toEqual({ ok: false, reason: "empty" });
  });

  it("bounds the amount of prose sent to an editor action", () => {
    const document = articleDocument("x".repeat(MAX_AI_SELECTION_CHARACTERS + 1));
    const selection = TextSelection.create(
      document,
      1,
      MAX_AI_SELECTION_CHARACTERS + 2,
    );

    expect(captureArticleSelection(document, selection, 1)).toEqual({
      ok: false,
      reason: "too-long",
    });
  });

  it("finds an exact quote inside a text block for an explicit rewrite", () => {
    const document = articleDocument("Alpha beta.", "Second paragraph.");
    expect(findTextBookmark(document, "Second")).toEqual({
      from: 14,
      to: 20,
      anchor: 14,
      head: 20,
    });
    expect(findTextBookmark(document, "Missing")).toBeNull();
  });
});
