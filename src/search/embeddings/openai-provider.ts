import { createOpenAI, type OpenAIProviderSettings } from "@ai-sdk/openai";
import { embedMany } from "ai";

import {
  ArchiveEmbeddingError,
  type ArchiveEmbeddingProvider,
} from "./provider";

type OpenAiArchiveEmbeddingProviderOptions = {
  apiKey: string;
  fetch?: OpenAIProviderSettings["fetch"];
};

function statusCode(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined;
  const value = Reflect.get(error, "statusCode") ?? Reflect.get(error, "status");
  return typeof value === "number" ? value : undefined;
}

function providerError(error: unknown) {
  if (error instanceof ArchiveEmbeddingError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new ArchiveEmbeddingError("cancelled", "The embedding request was cancelled.");
  }
  const status = statusCode(error);
  if (status === 401 || status === 403) {
    return new ArchiveEmbeddingError("openai_authentication");
  }
  if (status === 429) return new ArchiveEmbeddingError("openai_rate_limit");
  if (status !== undefined && status >= 500) {
    return new ArchiveEmbeddingError("openai_unavailable");
  }
  return new ArchiveEmbeddingError("openai_request_failed");
}

export function createOpenAiArchiveEmbeddingProvider(
  options: OpenAiArchiveEmbeddingProviderOptions,
): ArchiveEmbeddingProvider {
  const openai = createOpenAI({ apiKey: options.apiKey, fetch: options.fetch });

  return {
    async embedMany(request) {
      try {
        const result = await embedMany({
          model: openai.embedding(request.model),
          values: request.values,
          abortSignal: request.signal,
          maxParallelCalls: 1,
          providerOptions: {
            openai: { dimensions: request.dimensions },
          },
        });
        return {
          embeddings: result.embeddings,
          inputTokens: result.usage.tokens,
        };
      } catch (error) {
        throw providerError(error);
      }
    },
  };
}
