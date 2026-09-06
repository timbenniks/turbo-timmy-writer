import { z } from "zod";

export const restoreArticleVersionInputSchema = z.object({
  articleId: z.uuid(),
  versionId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
});
