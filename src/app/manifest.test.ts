import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("web app manifest", () => {
  it("defines a scoped standalone app with a local icon", () => {
    expect(manifest()).toMatchObject({
      name: "Turbo Timmy Writer",
      start_url: "/",
      scope: "/",
      display: "standalone",
      icons: [{ src: "/icon.svg", type: "image/svg+xml" }],
    });
  });
});
