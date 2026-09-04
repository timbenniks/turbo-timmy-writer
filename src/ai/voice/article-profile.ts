import {
  voiceGuidanceSchema,
  writingProfileSchema,
  type VoiceGuidance,
} from "./model";

export const initialArticleVoiceProfile = writingProfileSchema.parse({
  schemaVersion: 1,
  profileType: "article",
  profileVersion: 1,
  observations: [
    {
      id: "opinionated-sentence-case-title",
      category: "title",
      guidance: "Use a specific, opinionated title in sentence case. The title should carry a real claim, not empty clickbait.",
      confidence: "high",
      evidence: ["articles.md: title patterns", "editorial-rules.md: title case headings"],
    },
    {
      id: "thesis-first-opening",
      category: "opening",
      guidance: "State the thesis in the first two sentences. Skip generic scene-setting, definitions, and opening questions.",
      confidence: "high",
      evidence: ["articles.md: opening paragraph", "editorial-rules.md: fragmented header warm-ups"],
    },
    {
      id: "experience-backed-authority",
      category: "authority",
      guidance: "Ground authority in Tim's supplied experience and concrete work. Never invent a story, result, metric, or source.",
      confidence: "high",
      evidence: ["articles.md: experienced authority", "editorial-rules.md: accuracy"],
    },
    {
      id: "challenge-and-invert",
      category: "argument",
      guidance: "When the premise supports it, name the conventional view, challenge it, and explain the more useful framing.",
      confidence: "high",
      evidence: ["articles.md: inversion pattern"],
    },
    {
      id: "bold-then-qualify",
      category: "argument",
      guidance: "Make the strongest supportable claim, then acknowledge the real limitation or counterargument without dissolving the opinion.",
      confidence: "high",
      evidence: ["articles.md: build first then qualify", "articles.md: honesty section"],
    },
    {
      id: "mixed-sentence-rhythm",
      category: "rhythm",
      guidance: "Mix flowing explanatory sentences with occasional short declarative sentences or fragments. Do not force a repeated cadence.",
      confidence: "high",
      evidence: ["articles.md: sentence rhythm and pacing", "editorial-rules.md: personality and soul"],
    },
    {
      id: "flexible-article-shape",
      category: "structure",
      guidance: "Use short, parallel, unique headings only when they help the argument. Do not impose a fixed section formula or mandatory concluding heading.",
      confidence: "medium",
      evidence: ["articles.md: heading rules", "Product decision: observed formulas are evidence, not templates"],
    },
    {
      id: "specific-active-language",
      category: "precision",
      guidance: "Prefer specific nouns and active verbs. Cut filler, redundant phrases, empty modifiers, bare 'this', and vague attribution.",
      confidence: "high",
      evidence: ["articles.md: writing craft", "editorial-rules.md: language and brevity rules"],
    },
    {
      id: "restrained-formatting",
      category: "structure",
      guidance: "Use lists and emphasis only when they improve comprehension. Keep headings in sentence case and introduce every list.",
      confidence: "high",
      evidence: ["articles.md: formatting conventions", "editorial-rules.md: structure rules"],
    },
    {
      id: "avoid-generated-tells",
      category: "anti-pattern",
      guidance: "Avoid promotional inflation, chatbot residue, vague authority, mechanical rule-of-three lists, signposting, and generic optimistic endings.",
      confidence: "high",
      evidence: ["editorial-rules.md: AI pattern catalog"],
    },
    {
      id: "plain-punctuation",
      category: "anti-pattern",
      guidance: "Do not use emoji or em/en dashes in article prose. Prefer straight quotes and ordinary punctuation.",
      confidence: "high",
      evidence: ["articles.md: what Tim does not do", "editorial-rules.md: formatting"],
    },
  ],
  evidenceSummary: {
    schemaVersion: 1,
    repository: "timbenniks/timbenniks-writing-voice",
    sourceFiles: ["references/articles.md", "references/editorial-rules.md"],
    curationNote: "Curated observations from the audited seed repository. Repeated tendencies carry confidence; rigid formulas and catchphrases remain optional evidence rather than mandatory instructions.",
  },
});

export function selectArticleVoiceGuidance(): VoiceGuidance {
  return voiceGuidanceSchema.parse({
    profileType: initialArticleVoiceProfile.profileType,
    profileVersion: initialArticleVoiceProfile.profileVersion,
    observations: initialArticleVoiceProfile.observations.map(({ id, guidance, confidence }) => ({
      id,
      guidance,
      confidence,
    })),
  });
}
