import { createOpenAI, type OpenAIProviderSettings } from "@ai-sdk/openai";
import { generateText, Output, streamText, type LanguageModelUsage } from "ai";

import {
  AiProviderError,
  type AiProvider,
  type AiTokenUsage,
} from "./provider";

type OpenAiProviderOptions = {
  apiKey: string;
  fetch?: OpenAIProviderSettings["fetch"];
};

function tokenUsage(usage: LanguageModelUsage): AiTokenUsage | undefined {
  if (usage.inputTokens === undefined || usage.outputTokens === undefined) {
    return undefined;
  }
  return { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
}

function statusCode(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined;
  const value = Reflect.get(error, "statusCode") ?? Reflect.get(error, "status");
  return typeof value === "number" ? value : undefined;
}

function providerError(error: unknown): AiProviderError {
  if (error instanceof AiProviderError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AiProviderError("cancelled", "The AI request was cancelled.");
  }

  const status = statusCode(error);
  if (status === 401 || status === 403) {
    return new AiProviderError("openai_authentication");
  }
  if (status === 429) return new AiProviderError("openai_rate_limit");
  if (status !== undefined && status >= 500) {
    return new AiProviderError("openai_unavailable");
  }
  if (error instanceof Error && /timeout/i.test(error.name)) {
    return new AiProviderError("openai_timeout");
  }
  return new AiProviderError("openai_request_failed");
}

export function createOpenAiProvider(options: OpenAiProviderOptions): AiProvider {
  const openai = createOpenAI({ apiKey: options.apiKey, fetch: options.fetch });

  return {
    async *streamText(request) {
      try {
        const result = streamText({
          model: openai.responses(request.model),
          instructions: request.instructions,
          prompt: request.input,
          abortSignal: request.signal,
          maxOutputTokens: request.maxOutputTokens,
          timeout: 45_000,
          providerOptions: { openai: { store: false } },
        });

        for await (const event of result.stream) {
          if (event.type === "text-delta") {
            yield { type: "text-delta" as const, text: event.text };
          } else if (event.type === "error") {
            throw event.error;
          } else if (event.type === "abort") {
            throw new DOMException("The AI request was cancelled.", "AbortError");
          }
        }

        const [usage, response, finishReason] = await Promise.all([
          result.usage,
          result.response,
          result.finishReason,
        ]);
        yield {
          type: "response-completed" as const,
          responseId: response.id,
          finishReason,
          usage: tokenUsage(usage),
        };
      } catch (error) {
        throw providerError(error);
      }
    },

    async generateStructured(request) {
      try {
        const result = await generateText({
          model: openai.responses(request.model),
          instructions: request.instructions,
          prompt: request.input,
          abortSignal: request.signal,
          maxOutputTokens: request.maxOutputTokens,
          timeout: 45_000,
          output: Output.object({
            name: request.outputName,
            schema: request.outputSchema,
          }),
          providerOptions: { openai: { store: false } },
        });
        return {
          output: result.output,
          responseId: result.response.id,
          finishReason: result.finishReason,
          usage: tokenUsage(result.usage),
        };
      } catch (error) {
        throw providerError(error);
      }
    },
  };
}
