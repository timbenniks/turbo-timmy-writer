import { z } from "zod";

import { websitePublicationTargets } from "@/publishing/website-contract";

export const publicationStatuses = ["pending", "succeeded", "failed"] as const;
export const publicationOperations = ["create", "update"] as const;

export const publicationAttemptSchema = z.object({
  target: z.enum(websitePublicationTargets),
  operation: z.enum(publicationOperations),
  status: z.enum(publicationStatuses),
  repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  path: z.string().trim().min(1).max(1_024),
  branch: z.string().trim().min(1).max(255),
  variantRevision: z.number().int().positive(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  expectedBlobSha: z.string().regex(/^[a-f0-9]{40}$/).nullable(),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/).nullable(),
  blobSha: z.string().regex(/^[a-f0-9]{40}$/).nullable(),
  externalUrl: z.url().nullable(),
  errorCode: z.string().trim().min(1).max(100).nullable(),
  completedAt: z.date().nullable(),
}).superRefine((attempt, context) => {
  if (attempt.operation === "create" && attempt.expectedBlobSha !== null) {
    context.addIssue({ code: "custom", path: ["expectedBlobSha"], message: "Creates cannot carry an existing blob SHA." });
  }
  if (attempt.operation === "update" && attempt.expectedBlobSha === null) {
    context.addIssue({ code: "custom", path: ["expectedBlobSha"], message: "Updates require the expected blob SHA." });
  }
  const succeeded = attempt.status === "succeeded";
  const failed = attempt.status === "failed";
  if (succeeded !== Boolean(attempt.commitSha && attempt.blobSha && attempt.externalUrl)) {
    context.addIssue({ code: "custom", path: ["status"], message: "Successful attempts require commit, blob, and URL results." });
  }
  if ((succeeded || failed) !== Boolean(attempt.completedAt)) {
    context.addIssue({ code: "custom", path: ["completedAt"], message: "Only completed attempts have a completion time." });
  }
  if (failed !== Boolean(attempt.errorCode)) {
    context.addIssue({ code: "custom", path: ["errorCode"], message: "Only failed attempts have an error code." });
  }
});

export function publicationTransitionAllowed(
  current: (typeof publicationStatuses)[number],
  next: (typeof publicationStatuses)[number],
) {
  return current === "pending" && (next === "succeeded" || next === "failed");
}
