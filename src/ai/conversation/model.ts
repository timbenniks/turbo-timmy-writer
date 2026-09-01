import { z } from "zod";

export const articleStartPremiseSchema = z
  .string()
  .trim()
  .min(1, "Share a premise to start the conversation.")
  .max(6_000, "Keep the premise under 6,000 characters.");

export const writingSessionTypes = ["article-start"] as const;
export const writingSessionStatuses = [
  "active",
  "completed",
  "cancelled",
] as const;
export const writingMessageRoles = ["user", "assistant"] as const;

export const writingMessageTextSchema = z.object({
  version: z.literal(1),
  type: z.literal("text"),
  text: z.string().min(1).max(20_000),
});

export type WritingMessageText = z.infer<typeof writingMessageTextSchema>;

export function createWritingMessageText(text: string): WritingMessageText {
  return writingMessageTextSchema.parse({ version: 1, type: "text", text });
}
