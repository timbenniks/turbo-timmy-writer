import { z } from "zod";

export const voiceProfileTypes = ["article"] as const;
export const voiceProfileStatuses = ["draft", "active", "superseded"] as const;

const voiceObservationSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/).max(100),
  category: z.enum([
    "title",
    "opening",
    "authority",
    "argument",
    "rhythm",
    "structure",
    "precision",
    "anti-pattern",
  ]),
  guidance: z.string().trim().min(1).max(500),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.array(z.string().trim().min(1).max(300)).min(1).max(8),
});

const voiceEvidenceSummarySchema = z.object({
  schemaVersion: z.literal(1),
  repository: z.string().trim().min(1).max(200),
  sourceFiles: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
  curationNote: z.string().trim().min(1).max(1_000),
});

export const writingProfileSchema = z.object({
  schemaVersion: z.literal(1),
  profileType: z.enum(voiceProfileTypes),
  profileVersion: z.number().int().positive(),
  observations: z.array(voiceObservationSchema).min(1).max(40),
  evidenceSummary: voiceEvidenceSummarySchema,
});

export const voiceGuidanceSchema = z.object({
  profileType: z.enum(voiceProfileTypes),
  profileVersion: z.number().int().positive(),
  observations: z.array(
    voiceObservationSchema.pick({ id: true, guidance: true, confidence: true }),
  ).max(12),
});

export type VoiceObservation = z.infer<typeof voiceObservationSchema>;
export type VoiceEvidenceSummary = z.infer<typeof voiceEvidenceSummarySchema>;
export type VoiceGuidance = z.infer<typeof voiceGuidanceSchema>;
