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
  OPENAI_MODEL_REPURPOSE: "repurpose-model",
  OPENAI_MODEL_EMBEDDING: "embedding-model",
};

describe("AI model configuration", () => {
  it("parses every model purpose from one environment boundary", () => {
    const configuration = parseAiModelConfiguration(environment);

    expect(resolveAiModel(configuration, "draft")).toBe("draft-model");
    expect(resolveAiModel(configuration, "embedding")).toBe(
      "embedding-model",
    );
    expect(resolveAiModel(configuration, "repurpose")).toBe("repurpose-model");
  });

  it("uses one shared model for generative work", () => {
    const configuration = parseAiModelConfiguration({
      OPENAI_MODEL: "shared-model",
    });

    expect(resolveAiModel(configuration, "interview")).toBe("shared-model");
    expect(resolveAiModel(configuration, "draft")).toBe("shared-model");
    expect(resolveAiModel(configuration, "repurpose")).toBe("shared-model");
    expect(configuration.embedding).toBeUndefined();
  });

  it("allows a purpose-specific model to override the shared model", () => {
    const configuration = parseAiModelConfiguration({
      OPENAI_MODEL: "shared-model",
      OPENAI_MODEL_INTERVIEW: "interview-model",
    });

    expect(resolveAiModel(configuration, "interview")).toBe("interview-model");
    expect(resolveAiModel(configuration, "draft")).toBe("shared-model");
  });

  it("fails closed when no generative model is configured", () => {
    expect(() => parseAiModelConfiguration({})).toThrow();
  });

  it("fails only when an unconfigured embedding model is resolved", () => {
    const configuration = parseAiModelConfiguration({
      OPENAI_MODEL: "shared-model",
    });

    expect(() => resolveAiModel(configuration, "embedding")).toThrow(
      "No AI model is configured for embedding.",
    );
  });
});
