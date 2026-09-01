import {
  AiProviderError,
  type AiProvider,
  type AiProviderRequest,
  type AiProviderStreamEvent,
  type AiStructuredProviderRequest,
  type AiStructuredProviderResponse,
  type AiTokenUsage,
} from "./provider";

type MockAiProviderOptions = {
  textChunks?: string[];
  structuredOutput?: unknown;
  usage?: AiTokenUsage;
  responseId?: string;
  finishReason?: string;
  failAtTextChunk?: number;
  structuredErrorCode?: string;
};

export class MockAiProvider implements AiProvider {
  readonly requests: Array<
    | { mode: "stream-text"; request: AiProviderRequest }
    | { mode: "structured"; request: AiStructuredProviderRequest<unknown> }
  > = [];

  constructor(private readonly options: MockAiProviderOptions = {}) {}

  async *streamText(
    request: AiProviderRequest,
  ): AsyncIterable<AiProviderStreamEvent> {
    this.requests.push({ mode: "stream-text", request });

    const chunks = this.options.textChunks ?? ["Mock response"];
    for (const [index, text] of chunks.entries()) {
      if (request.signal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }
      if (this.options.failAtTextChunk === index) {
        throw new AiProviderError("mock_stream_failure");
      }
      yield { type: "text-delta", text };
    }

    yield {
      type: "response-completed",
      responseId: this.options.responseId ?? "mock-response",
      finishReason: this.options.finishReason ?? "stop",
      usage: this.options.usage ?? { inputTokens: 10, outputTokens: 5 },
    };
  }

  async generateStructured<TOutput>(
    request: AiStructuredProviderRequest<TOutput>,
  ): Promise<AiStructuredProviderResponse> {
    this.requests.push({
      mode: "structured",
      request: request as AiStructuredProviderRequest<unknown>,
    });
    if (this.options.structuredErrorCode) {
      throw new AiProviderError(this.options.structuredErrorCode);
    }
    return {
      output: this.options.structuredOutput ?? {},
      responseId: this.options.responseId ?? "mock-response",
      finishReason: this.options.finishReason ?? "stop",
      usage: this.options.usage ?? { inputTokens: 10, outputTokens: 5 },
    };
  }
}
