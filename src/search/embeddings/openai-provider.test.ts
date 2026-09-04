import { describe, expect, it } from "vitest";

import { ARCHIVE_EMBEDDING_DIMENSIONS } from "@/search/chunking/archive-chunks";

import { createOpenAiArchiveEmbeddingProvider } from "./openai-provider";
import { createArchiveEmbeddings } from "./provider";

describe("OpenAI archive embedding provider", () => {
  it("uses the embeddings endpoint with explicit fixed dimensions", async () => {
    let requestUrl = "";
    let requestBody: unknown;
    const provider = createOpenAiArchiveEmbeddingProvider({
      apiKey: "test-key",
      fetch: async (input, init) => {
        requestUrl = String(input);
        requestBody = JSON.parse(String(init?.body)) as unknown;
        return Response.json({
          object: "list",
          data: [{
            object: "embedding",
            embedding: Array.from(
              { length: ARCHIVE_EMBEDDING_DIMENSIONS },
              () => 0.125,
            ),
            index: 0,
          }],
          model: "text-embedding-3-small",
          usage: { prompt_tokens: 7, total_tokens: 7 },
        });
      },
    });

    const result = await createArchiveEmbeddings(provider, {
      model: "text-embedding-3-small",
      values: ["Article title\n\nAn attributed passage."],
    });

    expect(requestUrl).toBe("https://api.openai.com/v1/embeddings");
    expect(requestBody).toMatchObject({
      model: "text-embedding-3-small",
      dimensions: ARCHIVE_EMBEDDING_DIMENSIONS,
      input: ["Article title\n\nAn attributed passage."],
    });
    expect(result.embeddings[0]).toHaveLength(ARCHIVE_EMBEDDING_DIMENSIONS);
    expect(result.inputTokens).toBe(7);
  });
});
