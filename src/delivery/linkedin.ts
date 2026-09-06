import { z } from "zod";

const authorUrnSchema = z.string().trim().regex(/^urn:li:person:[0-9]+$/).max(200);
const commentarySchema = z.string().trim().min(1).max(3_000);

export function linkedInTextPostSnapshot(input: { authorUrn: string; commentary: string }) {
  return {
    author: authorUrnSchema.parse(input.authorUrn),
    commentary: commentarySchema.parse(input.commentary),
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  } as const;
}
