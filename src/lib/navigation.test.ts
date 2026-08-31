import { describe, expect, it } from "vitest";

import { libraryDestinations } from "./navigation";

describe("libraryDestinations", () => {
  it("keeps the primary writing navigation unique and stable", () => {
    const labels = libraryDestinations.map(({ label }) => label);
    const hrefs = libraryDestinations.map(({ href }) => href);

    expect(labels).toEqual([
      "Library",
      "Drafts",
      "Ideas",
      "Published",
      "Archive",
    ]);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
