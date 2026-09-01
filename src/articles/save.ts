import { z } from "zod";

import {
  ARTICLE_DOCUMENT_VERSION,
  articleDocumentSchema,
} from "@/editor/document";

export const articleTitleSchema = z.string().max(200);

export const saveArticleInputSchema = z.object({
  articleId: z.uuid(),
  documentVersion: z.literal(ARTICLE_DOCUMENT_VERSION),
  title: articleTitleSchema,
  documentJson: articleDocumentSchema,
});

export type SaveArticleInput = z.infer<typeof saveArticleInputSchema>;

export type SaveArticleResult =
  | {
      ok: true;
      savedAt: string;
    }
  | {
      ok: false;
      message: string;
    };
