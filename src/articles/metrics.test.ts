import { describe, expect, it } from "vitest";

import { calculateWritingMetrics, countWords } from "./metrics";

describe("writing metrics", () => {
  it("counts Unicode words, numbers, and contractions deterministically", () => {
    expect(countWords("Tim’s careful draft isn't generic. Version 2 works.")).toBe(8);
    expect(countWords("  \n\t ")).toBe(0);
  });

  it("rounds reading time up without claiming time for an empty document", () => {
    expect(calculateWritingMetrics("")).toEqual({ wordCount: 0, readingMinutes: 0 });
    expect(calculateWritingMetrics("one two three", 2)).toEqual({
      wordCount: 3,
      readingMinutes: 2,
    });
  });
});
