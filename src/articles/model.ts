import { z } from "zod";

export const articleStatuses = [
  "idea",
  "interviewing",
  "drafting",
  "editing",
  "ready",
  "published",
  "archived",
] as const;

export const articleStatusSchema = z.enum(articleStatuses);
export type ArticleStatus = z.infer<typeof articleStatusSchema>;
export const articleIdSchema = z.uuid();

export const libraryFilters = [
  "all",
  "drafts",
  "ideas",
  "published",
  "archive",
] as const;

export const libraryFilterSchema = z.enum(libraryFilters);
export type LibraryFilter = z.infer<typeof libraryFilterSchema>;

export type ArticleDocument = {
  type: "doc";
  content: Array<Record<string, unknown>>;
};

export type ArticleMetadata = {
  version: 1;
};

export const emptyArticleDocument: ArticleDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const emptyArticleMetadata: ArticleMetadata = { version: 1 };

const transitions: Record<ArticleStatus, readonly ArticleStatus[]> = {
  idea: ["interviewing", "drafting", "archived"],
  interviewing: ["idea", "drafting", "archived"],
  drafting: ["editing", "ready", "archived"],
  editing: ["drafting", "ready", "archived"],
  ready: ["editing", "published", "archived"],
  published: ["editing", "archived"],
  archived: ["editing"],
};

export function canTransitionArticleStatus(
  from: ArticleStatus,
  to: ArticleStatus,
) {
  return from === to || transitions[from].includes(to);
}

export function statusesForLibraryFilter(
  filter: LibraryFilter,
): readonly ArticleStatus[] {
  switch (filter) {
    case "all":
      return articleStatuses.filter((status) => status !== "archived");
    case "drafts":
      return ["interviewing", "drafting", "editing", "ready"];
    case "ideas":
      return ["idea"];
    case "published":
      return ["published"];
    case "archive":
      return ["archived"];
  }
}

export function untitledArticleSlug(id: string) {
  return `untitled-${id}`;
}

export function articleDisplayTitle(title: string) {
  const trimmedTitle = title.trim();
  return trimmedTitle || "Untitled article";
}

export function articleStatusLabel(status: ArticleStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
