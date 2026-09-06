import { describe, expect, it } from "vitest";

import { linkedInTextPostSnapshot } from "./linkedin";

describe("LinkedIn delivery snapshot", () => {
  it("builds the exact immediate-publication request", () => {
    expect(linkedInTextPostSnapshot({
      authorUrn: "urn:li:person:123",
      commentary: "  Deliberate post  ",
    })).toMatchObject({
      author: "urn:li:person:123",
      commentary: "Deliberate post",
      visibility: "PUBLIC",
      lifecycleState: "PUBLISHED",
    });
  });
});
