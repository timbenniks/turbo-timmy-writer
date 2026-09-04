# Phase 5: variants

## Goal

Separate canonical writing from destination-specific distribution.

## Planned slices

1. Add variants, source-version relationships, content hashes, and tested stale detection.
2. Add independent versioned destination profiles and the repurpose skill.
3. Add editable LinkedIn post and long-form variants.
4. Add editable newsletter and website variants with typed metadata.
5. Add stale warnings, review choices, regeneration protection, and pre-regeneration snapshots.
6. Test canonical changes, manual edits, and concurrent regeneration decisions.

## Acceptance criteria

- One article supports several destination variants.
- Variants remain manually editable.
- Canonical edits never overwrite variants.
- Stale variants are clearly identified.
- Regeneration cannot silently destroy edits.
- Destination rules remain independent modules.

## Current checkpoint

Phase 5 is in progress. Slice 1 adds four typed destination/content/metadata
boundaries, deterministic canonical and variant SHA-256 hashes, and a pure stale
calculation that reports revision and content changes independently. Regeneration
of an existing variant always requires a snapshot and refuses unconfirmed manual
edits.

Additive migration `0013_calm_tarantula.sql` adds one owner/article/destination
variant, its exact source article version/revision/hash, optimistic variant
revision, manual-edit state, and immutable variant snapshots. All 14 migrations
pass against empty Postgres and produce 18 public tables. Migration `0013` remains
local and unapplied.

Slices 2–5 add independent v1 profiles for website, LinkedIn post, LinkedIn
article, and newsletter plus `article-repurpose/v1`. The structured skill receives
only the selected destination profile, canonical Markdown snapshot, and bounded
voice guidance; output must match the requested destination's exact schema.

The protected variant workspace supports all four destinations, typed metadata,
editable Markdown, calm formatting previews, clipboard copy, manual publication
state/URL tracking, and optimistic manual saves. Canonical editing and variant
editing use separate routes and tables.

Stale variants show the exact saved/current relationship and offer Review,
Regenerate, or Keep current without automatic replacement. Regeneration always
creates a history snapshot. A variant with manual edits additionally requires an
explicit browser confirmation, and the server independently enforces the same
guard. Article or variant changes during generation yield a conflict without
replacing either document.

Slice 6 covers revision-only/content-only staleness, manual-edit confirmation,
competing regeneration decisions, destination/schema mismatch, stable hashing,
form round-trips, and unsafe URLs. Unsaved client edits also block destination
switches, page exit, and regeneration unless Tim explicitly discards them.

Every Phase 5 acceptance criterion passes locally. One article supports all four
destination variants; every variant is independently editable; canonical writes
never touch variants; staleness is derived and visible; regeneration preserves a
snapshot and cannot silently replace manual edits; and destination profiles remain
independent modules.

The final gate passes Drizzle history validation, all 14 migrations against empty
Postgres, ESLint without warnings, standalone TypeScript, 88 tests across 32 files,
the normal Turbopack production build, and four credential-free browser checks at
desktop and phone widths. Phase 5 is complete locally. Authenticated variant UI QA
requires migrations `0012`/`0013`; neither migration was applied, and no Phase 4–5
commit was pushed or deployed.
