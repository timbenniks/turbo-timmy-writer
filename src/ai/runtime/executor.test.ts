import { z } from "zod";
import { describe, expect, it } from "vitest";

import type { AiModelConfiguration } from "./model-config";
import { MockAiProvider } from "./mock-provider";
import type {
  AiRunStore,
  CompleteAiRunInput,
  StartAiRunInput,
} from "./run-store";
import type { WritingSkill } from "./skill";
import { executeStructuredSkill, streamTextSkill } from "./executor";

const models: AiModelConfiguration = {
  interview: "interview-model",
  draft: "draft-model",
  edit: "edit-model",
  review: "review-model",
  repurpose: "repurpose-model",
  embedding: "embedding-model",
};

const inputSchema = z.object({ premise: z.string().min(1) });
const outputSchema = z.object({ question: z.string().min(1) });

const structuredSkill: WritingSkill<
  z.infer<typeof inputSchema>,
  z.infer<typeof outputSchema>
> = {
  id: "interview",
  version: "v1",
  name: "Interview",
  description: "Ask one useful question.",
  modelPurpose: "interview",
  inputSchema,
  outputSchema,
  buildInstructions: () => "Ask exactly one useful question.",
  buildInput: (input, context) =>
    JSON.stringify({ premise: input.premise, context }),
  resolveContext: async () => [
    { id: "principles-v1", kind: "editorial", content: "Be specific." },
  ],
};

const textSkill: WritingSkill<z.infer<typeof inputSchema>> = {
  ...structuredSkill,
  id: "draft",
  name: "Draft",
  description: "Draft prose from a premise.",
  modelPurpose: "draft",
  outputSchema: undefined,
};

class MemoryAiRunStore implements AiRunStore {
  starts: StartAiRunInput[] = [];
  completions: CompleteAiRunInput[] = [];

  async start(input: StartAiRunInput) {
    this.starts.push(input);
    return { id: `run-${this.starts.length}` };
  }

  async complete(input: CompleteAiRunInput) {
    this.completions.push(input);
  }
}

function runtimeDependencies(provider: MockAiProvider, runStore: MemoryAiRunStore) {
  let elapsed = 100;
  return {
    provider,
    runStore,
    models,
    now: () => new Date("2026-09-01T12:00:00.000Z"),
    monotonicNow: () => {
      elapsed += 21;
      return elapsed;
    },
  };
}

describe("AI runtime", () => {
  it("rejects invalid skill input before starting a billable run", async () => {
    const provider = new MockAiProvider();
    const runStore = new MemoryAiRunStore();

    await expect(
      executeStructuredSkill(runtimeDependencies(provider, runStore), {
        userId: "user-1",
        skill: structuredSkill,
        input: { premise: "" },
      }),
    ).rejects.toBeInstanceOf(z.ZodError);
    expect(runStore.starts).toHaveLength(0);
    expect(provider.requests).toHaveLength(0);
  });

  it("validates structured output and logs safe run metadata", async () => {
    const provider = new MockAiProvider({
      structuredOutput: { question: "What changed your mind?" },
      usage: { inputTokens: 23, outputTokens: 7 },
      responseId: "response-123",
    });
    const runStore = new MemoryAiRunStore();

    const result = await executeStructuredSkill(
      runtimeDependencies(provider, runStore),
      {
        userId: "user-1",
        articleId: "article-1",
        skill: structuredSkill,
        input: { premise: "AI should make writers more deliberate." },
      },
    );

    expect(result).toEqual({
      runId: "run-1",
      output: { question: "What changed your mind?" },
    });
    expect(runStore.starts[0]).toMatchObject({
      skillId: "interview",
      skillVersion: "v1",
      model: "interview-model",
    });
    expect(runStore.completions[0]).toMatchObject({
      status: "succeeded",
      usage: { inputTokens: 23, outputTokens: 7 },
      durationMs: 21,
      outcome: {
        version: 1,
        mode: "structured",
        responseId: "response-123",
        outputValidated: true,
      },
    });
    expect(JSON.stringify(runStore.completions)).not.toContain(
      "AI should make writers more deliberate",
    );
  });

  it("records invalid structured output without retaining that output", async () => {
    const provider = new MockAiProvider({
      structuredOutput: { notAQuestion: "invalid" },
    });
    const runStore = new MemoryAiRunStore();

    await expect(
      executeStructuredSkill(runtimeDependencies(provider, runStore), {
        userId: "user-1",
        skill: structuredSkill,
        input: { premise: "A premise" },
      }),
    ).rejects.toMatchObject({ code: "structured_output_parse_failure" });
    expect(runStore.completions[0]).toMatchObject({
      status: "failed",
      errorCode: "structured_output_parse_failure",
      usage: { inputTokens: 10, outputTokens: 5 },
      outcome: { outputValidated: false },
    });
    expect(JSON.stringify(runStore.completions)).not.toContain("notAQuestion");
  });

  it("streams deterministic text and records provider usage", async () => {
    const provider = new MockAiProvider({
      textChunks: ["First ", "draft."],
      usage: { inputTokens: 12, outputTokens: 2 },
    });
    const runStore = new MemoryAiRunStore();
    const chunks: string[] = [];

    for await (const chunk of streamTextSkill(
      runtimeDependencies(provider, runStore),
      {
        userId: "user-1",
        skill: textSkill,
        input: { premise: "A premise" },
      },
    )) {
      chunks.push(chunk);
    }

    expect(chunks.join("")).toBe("First draft.");
    expect(runStore.completions[0]).toMatchObject({
      status: "succeeded",
      usage: { inputTokens: 12, outputTokens: 2 },
      outcome: { mode: "stream-text", responseId: "mock-response" },
    });
  });

  it("marks a stream cancelled when its consumer stops early", async () => {
    const provider = new MockAiProvider({ textChunks: ["one", "two"] });
    const runStore = new MemoryAiRunStore();

    for await (const chunk of streamTextSkill(
      runtimeDependencies(provider, runStore),
      {
        userId: "user-1",
        skill: textSkill,
        input: { premise: "A premise" },
      },
    )) {
      expect(chunk).toBe("one");
      break;
    }

    expect(runStore.completions[0]).toMatchObject({
      status: "cancelled",
      errorCode: "consumer_cancelled",
    });
  });

  it("stores only a safe provider failure code", async () => {
    const provider = new MockAiProvider({
      textChunks: ["one", "two"],
      failAtTextChunk: 1,
    });
    const runStore = new MemoryAiRunStore();

    await expect(async () => {
      for await (const chunk of streamTextSkill(
        runtimeDependencies(provider, runStore),
        {
          userId: "user-1",
          skill: textSkill,
          input: { premise: "private premise" },
        },
      )) {
        expect(chunk).toBe("one");
      }
    }).rejects.toMatchObject({ code: "mock_stream_failure" });

    expect(runStore.completions[0]).toMatchObject({
      status: "failed",
      errorCode: "mock_stream_failure",
    });
    expect(JSON.stringify(runStore.completions)).not.toContain("private premise");
  });
});
