import { z } from "zod";

const shortText = z.string().trim().max(2_000);
const optionalShortText = shortText.nullable();
const briefList = z.array(z.string().trim().min(1).max(1_000)).max(30);

export const articleBriefSchema = z.object({
  premise: z.string().trim().min(1).max(6_000),
  thesis: optionalShortText,
  audience: briefList,
  supportingPoints: briefList,
  evidence: briefList,
  examples: briefList,
  personalExperience: briefList,
  counterArguments: briefList,
  uncertainties: briefList,
  desiredTakeaway: optionalShortText,
  possibleAngles: briefList,
  thingsToAvoid: briefList,
});

export type ArticleBrief = z.infer<typeof articleBriefSchema>;

export function createPremiseBrief(premise: string): ArticleBrief {
  return articleBriefSchema.parse({
    premise,
    thesis: null,
    audience: [],
    supportingPoints: [],
    evidence: [],
    examples: [],
    personalExperience: [],
    counterArguments: [],
    uncertainties: [],
    desiredTakeaway: null,
    possibleAngles: [],
    thingsToAvoid: [],
  });
}
