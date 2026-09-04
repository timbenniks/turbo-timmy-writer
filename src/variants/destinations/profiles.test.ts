import { describe, expect, it } from "vitest";

import { destinationProfiles, getDestinationProfile } from "./index";

describe("destination profiles", () => {
  it("keeps every destination in an independent versioned profile", () => {
    expect(Object.keys(destinationProfiles)).toEqual([
      "website",
      "linkedin-post",
      "linkedin-article",
      "newsletter",
    ]);
    expect(getDestinationProfile("linkedin-post")).toMatchObject({
      version: "v1",
      destination: "linkedin-post",
    });
  });
});
