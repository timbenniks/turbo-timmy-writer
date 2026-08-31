import { describe, expect, it } from "vitest";

import { isAllowedGitHubLogin, normalizeGitHubLogin } from "./policy";

describe("GitHub login allowlist", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeGitHubLogin("  TimBenniks ")).toBe("timbenniks");
    expect(isAllowedGitHubLogin("TimBenniks", "timbenniks")).toBe(true);
  });

  it("rejects every other GitHub login", () => {
    expect(isAllowedGitHubLogin("someone-else", "timbenniks")).toBe(false);
  });
});
