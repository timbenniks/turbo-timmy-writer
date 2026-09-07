import { describe, expect, it } from "vitest";

import { summarizeUsage } from "./model";

describe("usage summary", () => {
  it("derives deterministic private metrics from existing records", () => {
    const now = new Date("2026-09-06T12:00:00Z");
    const summary = summarizeUsage({
      articles: [
        { status: "published", wordCount: 3, updatedAt: new Date("2026-09-01T00:00:00Z") },
        { status: "drafting", wordCount: 3, updatedAt: new Date("2026-07-01T00:00:00Z") },
      ],
      aiRuns: [
        { status: "succeeded", inputTokens: 100, outputTokens: 20, durationMs: 500, createdAt: now },
        { status: "failed", inputTokens: null, outputTokens: null, durationMs: 1_500, createdAt: now },
        { status: "running", inputTokens: null, outputTokens: null, durationMs: null, createdAt: now },
      ],
      variants: [
        { status: "ready", hasManualEdits: true, updatedAt: now },
        { status: "draft", hasManualEdits: false, updatedAt: now },
      ],
      publications: [
        { status: "succeeded", createdAt: now },
        { status: "failed", createdAt: new Date("2026-01-01T00:00:00Z") },
      ],
    }, now);

    expect(summary).toEqual({
      articles: {
        total: 2,
        words: 6,
        activeLast30Days: 1,
        statuses: { idea: 0, interviewing: 0, drafting: 1, editing: 0, ready: 0, published: 1, archived: 0 },
      },
      ai: {
        total: 3,
        succeeded: 1,
        failed: 1,
        inputTokens: 100,
        outputTokens: 20,
        averageDurationMs: 1_000,
        last30Days: 3,
      },
      variants: { total: 2, ready: 1, manuallyEdited: 1 },
      publications: { total: 2, succeeded: 1, failed: 1, last30Days: 1 },
    });
  });

  it("returns zero-safe metrics for a new account", () => {
    expect(summarizeUsage({ articles: [], aiRuns: [], variants: [], publications: [] }).ai.averageDurationMs)
      .toBeNull();
  });
});
