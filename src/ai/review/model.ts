import { z } from "zod";

export const reviewKinds = ["humanizer", "critic"] as const;
export type ReviewKind = (typeof reviewKinds)[number];

export const findingSeverities = ["note", "warning", "strong"] as const;

export const humanizerPatternIds = [
  "significance-inflation",
  "vague-attribution",
  "promotional-language",
  "ai-vocabulary-cluster",
  "negative-parallelism",
  "rule-of-three",
  "em-dash-overuse",
  "chatbot-artifact",
  "filler",
  "generic-conclusion",
  "signposting",
  "uniform-rhythm",
] as const;

export const humanizerCatalogV1 = [
  { id: "significance-inflation", label: "Significance inflation", guidance: "Ordinary facts are inflated into grand meaning." },
  { id: "vague-attribution", label: "Vague attribution", guidance: "Unnamed experts or observers hide weak evidence." },
  { id: "promotional-language", label: "Promotional language", guidance: "Brochure-like praise replaces concrete description." },
  { id: "ai-vocabulary-cluster", label: "AI vocabulary cluster", guidance: "Generated-sounding words cluster without adding precision." },
  { id: "negative-parallelism", label: "Negative parallelism", guidance: "Repeated 'not just X, but Y' framing sounds formulaic." },
  { id: "rule-of-three", label: "Forced rule of three", guidance: "Ideas are grouped into threes only to sound complete." },
  { id: "em-dash-overuse", label: "Em dash overuse", guidance: "Dashes manufacture punch where normal punctuation works." },
  { id: "chatbot-artifact", label: "Chatbot artifact", guidance: "Assistant residue appears in publication prose." },
  { id: "filler", label: "Filler", guidance: "Ceremony or duplicated meaning slows the passage." },
  { id: "generic-conclusion", label: "Generic conclusion", guidance: "The ending offers vague optimism instead of a concrete point." },
  { id: "signposting", label: "Signposting", guidance: "The prose announces what it will do instead of doing it." },
  { id: "uniform-rhythm", label: "Uniform rhythm", guidance: "Sentences repeat the same length and shape." },
] as const;

export const criticCategoryIds = [
  "claim",
  "repetition",
  "transition",
  "contradiction",
  "abstraction",
  "generated-prose",
  "opening",
  "ending",
  "evidence",
] as const;

const passageFindingSchema = z.object({
  categoryId: z.string().trim().min(1).max(100),
  severity: z.enum(findingSeverities),
  quote: z.string().trim().min(1).max(2_000).nullable(),
  explanation: z.string().trim().min(1).max(1_000),
});

export const humanizerOutputSchema = z.object({
  summary: z.string().trim().min(1).max(2_000),
  findings: z.array(passageFindingSchema.extend({
    categoryId: z.enum(humanizerPatternIds),
    quote: z.string().trim().min(1).max(2_000),
  })).max(30),
});

export const criticOutputSchema = z.object({
  summary: z.string().trim().min(1).max(2_000),
  findings: z.array(passageFindingSchema.extend({
    categoryId: z.enum(criticCategoryIds),
  })).max(40),
});

export type HumanizerOutput = z.infer<typeof humanizerOutputSchema>;
export type CriticOutput = z.infer<typeof criticOutputSchema>;
export type ArticleReviewOutput = HumanizerOutput | CriticOutput;
