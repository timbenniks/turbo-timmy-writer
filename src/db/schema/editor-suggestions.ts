import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import type { EditorSuggestionRequest } from "@/ai/editor/model";
import { editorSuggestionStatuses } from "@/ai/editor/model";

import { aiRuns } from "./ai-runs";
import { articles } from "./articles";
import { users } from "./users";

export const editorSuggestionStatus = pgEnum(
  "editor_suggestion_status",
  editorSuggestionStatuses,
);

export const editorSuggestions = pgTable(
  "editor_suggestions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    articleId: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    aiRunId: uuid("ai_run_id").notNull().references(() => aiRuns.id, { onDelete: "restrict" }),
    actionId: text("action_id").notNull(),
    instruction: text("instruction"),
    sourceRevision: integer("source_revision").notNull(),
    documentVersion: integer("document_version").notNull(),
    selectionFrom: integer("selection_from").notNull(),
    selectionTo: integer("selection_to").notNull(),
    selectionAnchor: integer("selection_anchor").notNull(),
    selectionHead: integer("selection_head").notNull(),
    originalText: text("original_text").notNull(),
    suggestedText: text("suggested_text").notNull(),
    status: editorSuggestionStatus("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("editor_suggestions_article_created_idx").on(table.articleId, table.createdAt),
    index("editor_suggestions_user_status_idx").on(table.userId, table.status),
  ],
);

export type EditorSuggestion = typeof editorSuggestions.$inferSelect;
export type EditorSuggestionSelection = EditorSuggestionRequest["selection"];
