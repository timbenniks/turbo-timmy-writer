import { describe, expect, it } from "vitest";

import {
  parseAiModelConfiguration,
  resolveAiModel,
} from "./model-config";

const environment = {
  OPENAI_MODEL_INTERVIEW: "interview-model",
  OPENAI_MODEL_DRAFT: "draft-model",
  OPENAI_MODEL_EDIT: "edit-model",
  OPENAI_MODEL_REVIEW: "review-model",
  OPENAI_MODEL_EMBEDDING: "embedding-model",
};

describe("AI model configuration", () => {
  it("parses every model purpose from one environment boundary", () => {
    const configuration = parseAiModelConfiguration(environment);

    expect(resolveAiModel(configuration, "draft")).toBe("draft-model");
    expect(resolveAiModel(configuration, "embedding")).toBe(
      "embedding-model",
    );
  });

  it("fails closed when one model is not configured", () => {
    expect(() =>
      parseAiModelConfiguration({
        ...environment,
        OPENAI_MODEL_REVIEW: "",
      }),
    ).toThrow();
  });
});
