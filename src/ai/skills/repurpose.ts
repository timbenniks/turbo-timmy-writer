import { z } from "zod";

import type { WritingSkill } from "@/ai/runtime/skill";
import { voiceGuidanceSchema } from "@/ai/voice/model";
import { destinationProfileSchema } from "@/variants/destinations/profile";
import {
  linkedinArticleVariantContentSchema,
  linkedinArticleVariantMetadataSchema,
  linkedinPostVariantContentSchema,
  linkedinPostVariantMetadataSchema,
  newsletterVariantContentSchema,
  newsletterVariantMetadataSchema,
  variantContentSchema,
  variantMetadataSchema,
  websiteVariantContentSchema,
  websiteVariantMetadataSchema,
  type VariantDestination,
} from "@/variants/model";

export const repurposeInputSchema = z.object({
  canonicalTitle: z.string().max(500),
  canonicalMarkdown: z.string().min(1).max(150_000),
  destinationProfile: destinationProfileSchema,
  voiceGuidance: voiceGuidanceSchema,
});

export const repurposeOutputSchema = z.object({
  content: variantContentSchema,
  metadata: variantMetadataSchema,
});

const outputSchemas = {
  website: z.object({
    content: websiteVariantContentSchema,
    metadata: websiteVariantMetadataSchema,
  }),
  "linkedin-post": z.object({
    content: linkedinPostVariantContentSchema,
    metadata: linkedinPostVariantMetadataSchema,
  }),
  "linkedin-article": z.object({
    content: linkedinArticleVariantContentSchema,
    metadata: linkedinArticleVariantMetadataSchema,
  }),
  newsletter: z.object({
    content: newsletterVariantContentSchema,
    metadata: newsletterVariantMetadataSchema,
  }),
} satisfies Record<VariantDestination, z.ZodType<RepurposeOutput>>;

export type RepurposeInput = z.infer<typeof repurposeInputSchema>;
export type RepurposeOutput = z.infer<typeof repurposeOutputSchema>;

export const repurposeSkill: WritingSkill<RepurposeInput, RepurposeOutput> = {
  id: "article-repurpose",
  version: "v1",
  name: "Article repurpose",
  description: "Creates one editable destination variant from a canonical article snapshot.",
  modelPurpose: "repurpose",
  maxOutputTokens: 10_000,
  inputSchema: repurposeInputSchema,
  outputSchema: repurposeOutputSchema,
  buildInstructions(input) {
    return [
      `Create one ${input.destinationProfile.name} variant from the supplied canonical article.`,
      "Return content and metadata for exactly the requested destination.",
      "Preserve the thesis, facts, uncertainty, links, and Tim's point of view. Do not invent evidence, personal experience, URLs, or publication claims.",
      "The variant is an editable derivative and must not modify or reinterpret the canonical article.",
      "Apply the voice observations selectively rather than as a rigid template.",
      ...input.destinationProfile.instructions,
    ].join("\n");
  },
  buildInput(input) {
    return JSON.stringify(input);
  },
};

export function repurposeSkillFor(
  destination: VariantDestination,
): WritingSkill<RepurposeInput, RepurposeOutput> {
  return {
    ...repurposeSkill,
    outputSchema: outputSchemas[destination] as z.ZodType<RepurposeOutput>,
  };
}

export function validateRepurposeDestination(
  destination: RepurposeInput["destinationProfile"]["destination"],
  output: RepurposeOutput,
) {
  if (
    output.content.destination !== destination ||
    output.metadata.destination !== destination
  ) {
    throw new Error("The generated variant did not match the requested destination.");
  }
  return output;
}
