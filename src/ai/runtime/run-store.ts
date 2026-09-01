import type { AiTokenUsage } from "./provider";

export const aiRunStatuses = [
  "running",
  "succeeded",
  "failed",
  "cancelled",
] as const;

export type AiRunStatus = (typeof aiRunStatuses)[number];

export type AiRunMode = "stream-text" | "structured";

export type AiRunOutcome = {
  version: 1;
  mode: AiRunMode;
  responseId?: string;
  finishReason?: string;
  outputValidated?: boolean;
};

export type StartAiRunInput = {
  userId: string;
  articleId?: string;
  skillId: string;
  skillVersion: string;
  model: string;
};

export type CompleteAiRunInput = {
  id: string;
  userId: string;
  status: Exclude<AiRunStatus, "running">;
  usage?: AiTokenUsage;
  durationMs: number;
  outcome?: AiRunOutcome;
  errorCode?: string;
  completedAt: Date;
};

export interface AiRunStore {
  start(input: StartAiRunInput): Promise<{ id: string }>;
  complete(input: CompleteAiRunInput): Promise<void>;
}
