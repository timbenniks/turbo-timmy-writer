import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { WritingMessageText } from "@/ai/conversation/model";
import {
  writingMessageRoles,
  writingSessionStatuses,
  writingSessionTypes,
} from "@/ai/conversation/model";

import { aiRuns } from "./ai-runs";
import { articles } from "./articles";
import { users } from "./users";

export const writingSessionType = pgEnum(
  "writing_session_type",
  writingSessionTypes,
);
export const writingSessionStatus = pgEnum(
  "writing_session_status",
  writingSessionStatuses,
);
export const writingMessageRole = pgEnum(
  "writing_message_role",
  writingMessageRoles,
);

export const writingSessions = pgTable(
  "writing_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    type: writingSessionType("type").notNull(),
    status: writingSessionStatus("status").default("active").notNull(),
    nextSequence: integer("next_sequence").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("writing_sessions_article_type_unique").on(
      table.articleId,
      table.type,
    ),
    index("writing_sessions_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export const writingMessages = pgTable(
  "writing_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => writingSessions.id, { onDelete: "cascade" }),
    role: writingMessageRole("role").notNull(),
    contentJson: jsonb("content_json").$type<WritingMessageText>().notNull(),
    plainText: text("plain_text").notNull(),
    aiRunId: uuid("ai_run_id").references(() => aiRuns.id, {
      onDelete: "set null",
    }),
    sequence: integer("sequence").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("writing_messages_session_sequence_unique").on(
      table.sessionId,
      table.sequence,
    ),
    index("writing_messages_session_created_idx").on(
      table.sessionId,
      table.createdAt,
    ),
  ],
);

export type WritingSession = typeof writingSessions.$inferSelect;
export type WritingMessage = typeof writingMessages.$inferSelect;
