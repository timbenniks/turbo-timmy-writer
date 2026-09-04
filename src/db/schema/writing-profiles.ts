import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { VoiceEvidenceSummary, VoiceObservation } from "@/ai/voice/model";
import { voiceProfileStatuses, voiceProfileTypes } from "@/ai/voice/model";

import { users } from "./users";

export const writingProfileStatus = pgEnum("writing_profile_status", voiceProfileStatuses);
export const writingProfileType = pgEnum("writing_profile_type", voiceProfileTypes);

export const writingProfiles = pgTable(
  "writing_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    profileType: writingProfileType("profile_type").notNull(),
    profileVersion: integer("profile_version").notNull(),
    observationsJson: jsonb("observations_json").$type<VoiceObservation[]>().notNull(),
    evidenceSummaryJson: jsonb("evidence_summary_json").$type<VoiceEvidenceSummary>().notNull(),
    analysisWindowStart: timestamp("analysis_window_start", { withTimezone: true }),
    analysisWindowEnd: timestamp("analysis_window_end", { withTimezone: true }),
    sourceCount: integer("source_count").notNull(),
    status: writingProfileStatus("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("writing_profiles_user_type_version_unique").on(
      table.userId,
      table.profileType,
      table.profileVersion,
    ),
    uniqueIndex("writing_profiles_one_active_per_type")
      .on(table.userId, table.profileType)
      .where(sql`${table.status} = 'active'`),
    index("writing_profiles_user_updated_idx").on(table.userId, table.updatedAt),
    check("writing_profiles_positive_version", sql`${table.profileVersion} > 0`),
    check("writing_profiles_positive_source_count", sql`${table.sourceCount} > 0`),
    check(
      "writing_profiles_valid_analysis_window",
      sql`${table.analysisWindowStart} is null or ${table.analysisWindowEnd} is null or ${table.analysisWindowStart} <= ${table.analysisWindowEnd}`,
    ),
  ],
);

export type WritingProfile = typeof writingProfiles.$inferSelect;
