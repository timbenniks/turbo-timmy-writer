import { describe, expect, it } from "vitest";

import { diffVersionText } from "./diff";

describe("diffVersionText", () => {
  it("returns deterministic additions, removals, and shared lines", () => {
    expect(diffVersionText("Opening\nOld claim\nEnding", "Opening\nNew claim\nEnding"))
      .toEqual({
        lines: [
          { kind: "unchanged", text: "Opening" },
          { kind: "removed", text: "Old claim" },
          { kind: "added", text: "New claim" },
          { kind: "unchanged", text: "Ending" },
        ],
        added: 1,
        removed: 1,
        unchanged: 2,
      });
  });

  it("handles empty snapshots", () => {
    expect(diffVersionText("", "First line\nSecond line")).toMatchObject({
      added: 2,
      removed: 0,
      unchanged: 0,
    });
  });

  it("uses a bounded comparison for unusually large documents", () => {
    const shared = Array.from({ length: 501 }, (_, index) => `Line ${index}`);
    const result = diffVersionText(
      [...shared, "Old ending"].join("\n"),
      [...shared, "New ending"].join("\n"),
    );

    expect(result).toMatchObject({ added: 1, removed: 1, unchanged: 501 });
    expect(result.lines.slice(-2)).toEqual([
      { kind: "removed", text: "Old ending" },
      { kind: "added", text: "New ending" },
    ]);
  });
});
