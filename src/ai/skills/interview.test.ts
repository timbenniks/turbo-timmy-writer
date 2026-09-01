import { describe, expect, it } from "vitest";

import { interviewSkill, isCompleteInterviewResponse } from "./interview";

describe("article interview skill", () => {
  it("keeps the interview dynamic and limited to one question", () => {
    const instructions = interviewSkill.buildInstructions({
      premise: "A premise",
      messages: [{ role: "user", text: "A premise" }],
    });

    expect(instructions).toContain("exactly one concise, useful question");
    expect(instructions).toContain("Do not follow a fixed question count");
    expect(instructions).toContain("asks to draft");
    expect(interviewSkill.maxOutputTokens).toBe(1_200);
  });

  it("rejects empty or visibly truncated responses", () => {
    expect(isCompleteInterviewResponse("What changed your mind?")).toBe(true);
    expect(isCompleteInterviewResponse("Enough context. I am ready when you are.")).toBe(true);
    expect(isCompleteInterviewResponse("What changed your")).toBe(false);
    expect(isCompleteInterviewResponse("   ")).toBe(false);
  });

  it("serializes the premise and complete conversation", () => {
    const input = interviewSkill.inputSchema.parse({
      premise: "AI prototypes should begin with editorial intent.",
      messages: [
        { role: "user", text: "AI prototypes should begin with editorial intent." },
        { role: "assistant", text: "What experience led you there?" },
      ],
    });

    expect(JSON.parse(interviewSkill.buildInput(input, []))).toEqual({
      premise: input.premise,
      conversation: input.messages,
    });
  });
});
