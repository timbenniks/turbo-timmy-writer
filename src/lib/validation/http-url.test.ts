import { describe, expect, it } from "vitest";

import { httpUrlSchema } from "./http-url";

describe("HTTP URL validation", () => {
  it("fails closed without throwing for empty and malformed input", () => {
    expect(() => httpUrlSchema.safeParse("")).not.toThrow();
    expect(httpUrlSchema.safeParse("").success).toBe(false);
    expect(httpUrlSchema.safeParse("not a URL").success).toBe(false);
  });

  it("accepts only HTTP and HTTPS URLs", () => {
    expect(httpUrlSchema.safeParse("https://example.com/article").success).toBe(true);
    expect(httpUrlSchema.safeParse("http://localhost:3001/article").success).toBe(true);
    expect(httpUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });
});
