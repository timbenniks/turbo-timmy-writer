import "server-only";

import type { AiProvider, AiStructuredProviderRequest } from "./provider";
import { createOpenAiProvider } from "./openai-provider";

function guidedTestProvider(): AiProvider {
  return {
    async *streamText(request) {
      const text = request.instructions.includes("complete, useful first draft")
        ? "# Mock first draft\n\nThe premise contains a useful tension. This deterministic draft preserves the author's evidence and uncertainty.\n\n## What matters\n\nSpecific experience makes the argument credible."
        : "Which concrete experience best demonstrates the tension in this premise?";
      for (const chunk of text.match(/[\s\S]{1,32}/g) ?? [text]) {
        yield { type: "text-delta" as const, text: chunk };
      }
      yield {
        type: "response-completed" as const,
        responseId: "guided-test-response",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 10 },
      };
    },
    async generateStructured<TOutput>(
      request: AiStructuredProviderRequest<TOutput>,
    ) {
      const parsedInput = JSON.parse(request.input) as unknown;
      const input =
        typeof parsedInput === "object" && parsedInput !== null
          ? parsedInput as { currentBrief?: unknown }
          : {};
      const current =
        typeof input.currentBrief === "object" && input.currentBrief !== null
          ? input.currentBrief as Record<string, unknown>
          : {};
      return {
        output: request.outputSchema.parse({
          ...current,
          thesis: "The interview should preserve specific evidence and honest uncertainty.",
          supportingPoints: [
            "Specific experience makes the eventual argument more credible.",
          ],
          evidence: ["Tim supplied a concrete interview answer."],
        }),
        responseId: "guided-test-structured-response",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 10 },
      };
    },
  };
}

export function createWritingProvider(apiKey: string) {
  if (
    process.env.VERCEL !== "1" &&
    process.env.AI_PROVIDER_MODE === "guided-test"
  ) {
    return guidedTestProvider();
  }
  return createOpenAiProvider({ apiKey });
}
