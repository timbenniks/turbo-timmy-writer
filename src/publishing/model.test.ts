import { describe, expect, it } from "vitest";

import { publicationAttemptSchema, publicationTransitionAllowed } from "./model";

const baseAttempt = {
  target: "timbenniksdev-2024" as const,
  operation: "create" as const,
  status: "pending" as const,
  repository: "timbenniks/timbenniksdev-2024",
  path: "content/4.writing/example.md",
  branch: "main",
  variantRevision: 2,
  contentHash: "a".repeat(64),
  expectedBlobSha: null,
  commitSha: null,
  blobSha: null,
  externalUrl: null,
  errorCode: null,
  completedAt: null,
};

describe("publication attempt state", () => {
  it("accepts pending, successful, and failed result shapes", () => {
    expect(publicationAttemptSchema.safeParse(baseAttempt).success).toBe(true);
    expect(publicationAttemptSchema.safeParse({
      ...baseAttempt,
      status: "succeeded",
      commitSha: "b".repeat(40),
      blobSha: "c".repeat(40),
      externalUrl: "https://github.com/timbenniks/timbenniksdev-2024/commit/example",
      completedAt: new Date(),
    }).success).toBe(true);
    expect(publicationAttemptSchema.safeParse({
      ...baseAttempt,
      status: "failed",
      errorCode: "github_conflict",
      completedAt: new Date(),
    }).success).toBe(true);
  });

  it("requires an expected blob SHA only for updates", () => {
    expect(publicationAttemptSchema.safeParse({
      ...baseAttempt,
      operation: "update",
    }).success).toBe(false);
    expect(publicationAttemptSchema.safeParse({
      ...baseAttempt,
      expectedBlobSha: "d".repeat(40),
    }).success).toBe(false);
  });

  it("rejects partial or contradictory terminal results", () => {
    expect(publicationAttemptSchema.safeParse({
      ...baseAttempt,
      status: "succeeded",
      commitSha: "b".repeat(40),
      completedAt: new Date(),
    }).success).toBe(false);
    expect(publicationAttemptSchema.safeParse({
      ...baseAttempt,
      errorCode: "unexpected",
    }).success).toBe(false);
  });

  it("allows one terminal transition and keeps terminal records immutable", () => {
    expect(publicationTransitionAllowed("pending", "succeeded")).toBe(true);
    expect(publicationTransitionAllowed("pending", "failed")).toBe(true);
    expect(publicationTransitionAllowed("succeeded", "failed")).toBe(false);
    expect(publicationTransitionAllowed("failed", "succeeded")).toBe(false);
    expect(publicationTransitionAllowed("pending", "pending")).toBe(false);
  });
});
