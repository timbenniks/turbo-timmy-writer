import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type { AiRunOutcome } from "@/ai/runtime/run-store";

import { articles } from "./articles";
import { users } from "./users";

export const aiRunStatus = pgEnum("ai_run_status", [
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    articleId: uuid("article_id").references(() => articles.id, {
      onDelete: "restrict",
    }),
    skillId: text("skill_id").notNull(),
    skillVersion: text("skill_version").notNull(),
    model: text("model").notNull(),
    status: aiRunStatus("status").default("running").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    durationMs: integer("duration_ms"),
    outcomeJson: jsonb("outcome_json").$type<AiRunOutcome>(),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("ai_runs_user_created_idx").on(table.userId, table.createdAt),
    index("ai_runs_article_created_idx").on(table.articleId, table.createdAt),
    index("ai_runs_skill_created_idx").on(table.skillId, table.createdAt),
  ],
);

export type AiRun = typeof aiRuns.$inferSelect;
