import type { z } from "zod";

export type AiTokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type AiProviderRequest = {
  model: string;
  instructions: string;
  input: string;
  signal?: AbortSignal;
};

export type AiProviderStreamEvent =
  | { type: "text-delta"; text: string }
  | {
      type: "response-completed";
      responseId?: string;
      finishReason?: string;
      usage?: AiTokenUsage;
    };

export type AiStructuredProviderRequest<TOutput> = AiProviderRequest & {
  outputName: string;
  outputSchema: z.ZodType<TOutput>;
};

export type AiStructuredProviderResponse = {
  output: unknown;
  responseId?: string;
  finishReason?: string;
  usage?: AiTokenUsage;
};

export interface AiProvider {
  streamText(
    request: AiProviderRequest,
  ): AsyncIterable<AiProviderStreamEvent>;
  generateStructured<TOutput>(
    request: AiStructuredProviderRequest<TOutput>,
  ): Promise<AiStructuredProviderResponse>;
}

export class AiProviderError extends Error {
  constructor(
    public readonly code: string,
    message = "The AI provider request failed.",
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}
