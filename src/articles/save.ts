import { z } from "zod";

import {
  ARTICLE_DOCUMENT_VERSION,
  articleDocumentSchema,
} from "@/editor/document";

export const articleTitleSchema = z.string().max(200);

export const saveArticleInputSchema = z.object({
  articleId: z.uuid(),
  documentVersion: z.literal(ARTICLE_DOCUMENT_VERSION),
  expectedRevision: z.int().positive(),
  title: articleTitleSchema,
  documentJson: articleDocumentSchema,
});

export type SaveArticleInput = z.infer<typeof saveArticleInputSchema>;

export type SaveArticleResult =
  | {
      ok: true;
      revision: number;
      savedAt: string;
    }
  | {
      ok: false;
      code: "conflict";
      currentRevision: number;
      message: string;
    }
  | {
      ok: false;
      code: "invalid" | "not-found" | "unauthorized";
      message: string;
    };

export function hasChangesAfterSaveStarted(
  changeRevisionAtSave: number,
  currentChangeRevision: number,
) {
  return currentChangeRevision !== changeRevisionAtSave;
}
