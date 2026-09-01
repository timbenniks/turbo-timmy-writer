import { describe, expect, it } from "vitest";

import { articleBriefSchema, createPremiseBrief } from "./model";

describe("article brief", () => {
  it("creates a useful valid brief before the first provider call", () => {
    const brief = createPremiseBrief("  A rough but useful premise.  ");

    expect(brief.premise).toBe("A rough but useful premise.");
    expect(brief.supportingPoints).toEqual([]);
    expect(articleBriefSchema.parse(brief)).toEqual(brief);
  });

  it("rejects oversized or empty list entries", () => {
    const brief = createPremiseBrief("A premise");
    expect(() =>
      articleBriefSchema.parse({ ...brief, evidence: [""] }),
    ).toThrow();
    expect(() =>
      articleBriefSchema.parse({
        ...brief,
        examples: Array.from({ length: 31 }, (_, index) => `Example ${index}`),
      }),
    ).toThrow();
  });
});
