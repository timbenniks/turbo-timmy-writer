import { z } from "zod";

import {
  resolveAiModel,
  type AiModelConfiguration,
} from "./model-config";
import {
  AiProviderError,
  type AiProvider,
  type AiStructuredProviderResponse,
  type AiTokenUsage,
} from "./provider";
import type {
  AiRunOutcome,
  AiRunStore,
  CompleteAiRunInput,
} from "./run-store";
import {
  writingContextSchema,
  writingSkillMetadataSchema,
  type WritingSkill,
} from "./skill";

type RuntimeDependencies = {
  provider: AiProvider;
  runStore: AiRunStore;
  models: AiModelConfiguration;
  now?: () => Date;
  monotonicNow?: () => number;
};

type ExecuteSkillInput<TInput, TOutput> = {
  userId: string;
  articleId?: string;
  skill: WritingSkill<TInput, TOutput>;
  input: unknown;
  signal?: AbortSignal;
};

type PreparedSkill<TInput, TOutput> = {
  instructions: string;
  providerInput: string;
  model: string;
  skill: WritingSkill<TInput, TOutput>;
};

export class AiRuntimeError extends Error {
  constructor(
    public readonly code: string,
    message = "The AI operation failed.",
  ) {
    super(message);
    this.name = "AiRuntimeError";
  }
}

function safeErrorCode(error: unknown, signal?: AbortSignal) {
  if (signal?.aborted) return "cancelled";
  if (error instanceof DOMException && error.name === "AbortError") {
    return "cancelled";
  }
  if (error instanceof AiRuntimeError || error instanceof AiProviderError) {
    const code = z
      .string()
      .regex(/^[a-z0-9_]+$/)
      .max(100)
      .safeParse(error.code);
    return code.success ? code.data : "ai_provider_error";
  }
  if (error instanceof z.ZodError) return "validation_failure";
  return "ai_provider_error";
}

function safeProviderIdentifier(value: string | undefined, maxLength: number) {
  if (!value) return undefined;
  const result = z
    .string()
    .regex(/^[a-zA-Z0-9._:-]+$/)
    .max(maxLength)
    .safeParse(value);
  return result.success ? result.data : undefined;
}

async function prepareSkill<TInput, TOutput>(
  skill: WritingSkill<TInput, TOutput>,
  input: unknown,
  models: AiModelConfiguration,
): Promise<PreparedSkill<TInput, TOutput>> {
  writingSkillMetadataSchema.parse(skill);
  const parsedInput = skill.inputSchema.parse(input);
  const context = writingContextSchema.parse(
    (await skill.resolveContext?.(parsedInput)) ?? [],
  );
  return {
    instructions: skill.buildInstructions(parsedInput),
    providerInput: skill.buildInput(parsedInput, context),
    model: resolveAiModel(models, skill.modelPurpose),
    skill,
  };
}

function completionInput(input: {
  id: string;
  userId: string;
  status: CompleteAiRunInput["status"];
  startedAt: number;
  monotonicNow: () => number;
  now: () => Date;
  usage?: AiTokenUsage;
  outcome?: AiRunOutcome;
  errorCode?: string;
}): CompleteAiRunInput {
  return {
    id: input.id,
    userId: input.userId,
    status: input.status,
    usage: input.usage,
    durationMs: Math.max(
      0,
      Math.round(input.monotonicNow() - input.startedAt),
    ),
    outcome: input.outcome,
    errorCode: input.errorCode,
    completedAt: input.now(),
  };
}

async function startRun<TInput, TOutput>(
  dependencies: RuntimeDependencies,
  request: ExecuteSkillInput<TInput, TOutput>,
  prepared: PreparedSkill<TInput, TOutput>,
) {
  return dependencies.runStore.start({
    userId: request.userId,
    articleId: request.articleId,
    skillId: prepared.skill.id,
    skillVersion: prepared.skill.version,
    model: prepared.model,
  });
}

export async function executeStructuredSkill<TInput, TOutput>(
  dependencies: RuntimeDependencies,
  request: ExecuteSkillInput<TInput, TOutput>,
): Promise<{ runId: string; output: TOutput }> {
  if (!request.skill.outputSchema) {
    throw new AiRuntimeError("missing_output_schema");
  }
  const prepared = await prepareSkill(request.skill, request.input, dependencies.models);
  const now = dependencies.now ?? (() => new Date());
  const monotonicNow = dependencies.monotonicNow ?? (() => performance.now());
  const startedAt = monotonicNow();
  const run = await startRun(dependencies, request, prepared);
  let response: AiStructuredProviderResponse | undefined;
  let output: TOutput;

  try {
    response = await dependencies.provider.generateStructured({
      model: prepared.model,
      instructions: prepared.instructions,
      input: prepared.providerInput,
      signal: request.signal,
      outputName: `${prepared.skill.id}_${prepared.skill.version}`,
      outputSchema: request.skill.outputSchema,
    });
    const parsed = request.skill.outputSchema.safeParse(response.output);
    if (!parsed.success) {
      throw new AiRuntimeError("structured_output_parse_failure");
    }
    output = parsed.data;
  } catch (error) {
    const errorCode = safeErrorCode(error, request.signal);
    await dependencies.runStore.complete(
      completionInput({
        id: run.id,
        userId: request.userId,
        status: errorCode === "cancelled" ? "cancelled" : "failed",
        startedAt,
        monotonicNow,
        now,
        usage: response?.usage,
        errorCode,
        outcome: {
          version: 1,
          mode: "structured",
          responseId: safeProviderIdentifier(response?.responseId, 200),
          finishReason: safeProviderIdentifier(response?.finishReason, 100),
          outputValidated: false,
        },
      }),
    );
    throw error;
  }

  await dependencies.runStore.complete(
    completionInput({
      id: run.id,
      userId: request.userId,
      status: "succeeded",
      startedAt,
      monotonicNow,
      now,
      usage: response.usage,
      outcome: {
        version: 1,
        mode: "structured",
        responseId: safeProviderIdentifier(response.responseId, 200),
        finishReason: safeProviderIdentifier(response.finishReason, 100),
        outputValidated: true,
      },
    }),
  );
  return { runId: run.id, output };
}

export async function* streamTextSkill<TInput>(
  dependencies: RuntimeDependencies,
  request: ExecuteSkillInput<TInput, string>,
): AsyncGenerator<string, { runId: string }, void> {
  const prepared = await prepareSkill(request.skill, request.input, dependencies.models);
  const now = dependencies.now ?? (() => new Date());
  const monotonicNow = dependencies.monotonicNow ?? (() => performance.now());
  const startedAt = monotonicNow();
  const run = await startRun(dependencies, request, prepared);
  let finalized = false;
  let providerCompleted = false;
  let usage: AiTokenUsage | undefined;
  let outcome: AiRunOutcome = { version: 1, mode: "stream-text" };

  try {
    for await (const event of dependencies.provider.streamText({
      model: prepared.model,
      instructions: prepared.instructions,
      input: prepared.providerInput,
      signal: request.signal,
    })) {
      if (event.type === "text-delta") {
        yield event.text;
      } else {
        providerCompleted = true;
        usage = event.usage;
        outcome = {
          ...outcome,
          responseId: safeProviderIdentifier(event.responseId, 200),
          finishReason: safeProviderIdentifier(event.finishReason, 100),
        };
      }
    }

    if (!providerCompleted) {
      throw new AiRuntimeError("provider_protocol_error");
    }
    finalized = true;
    await dependencies.runStore.complete(
      completionInput({
        id: run.id,
        userId: request.userId,
        status: "succeeded",
        startedAt,
        monotonicNow,
        now,
        usage,
        outcome,
      }),
    );
    return { runId: run.id };
  } catch (error) {
    if (finalized) throw error;
    const errorCode = safeErrorCode(error, request.signal);
    finalized = true;
    await dependencies.runStore.complete(
      completionInput({
        id: run.id,
        userId: request.userId,
        status: errorCode === "cancelled" ? "cancelled" : "failed",
        startedAt,
        monotonicNow,
        now,
        usage,
        outcome,
        errorCode,
      }),
    );
    throw error;
  } finally {
    if (!finalized) {
      finalized = true;
      await dependencies.runStore.complete(
        completionInput({
          id: run.id,
          userId: request.userId,
          status: "cancelled",
          startedAt,
          monotonicNow,
          now,
          usage,
          outcome,
          errorCode: "consumer_cancelled",
        }),
      );
    }
  }
}
