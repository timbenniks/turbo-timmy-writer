# Phase 6: website publishing

## Goal

Publish and update timbenniks.dev articles through a validated GitHub API adapter.

## Planned slices

1. Inspect the live and local website repositories and confirm their actual content schemas and deployment behaviour. Complete locally; verified findings are recorded in [`../website-publishing-research.md`](../website-publishing-research.md).
2. Implement and unit-test slugging, reading time, canonical URLs, target paths, YAML serialization, metadata duplication, canonical 2026 tags, and field validation. Complete locally for deterministic Nuxt 2024 and Astro 2026 output; no GitHub write adapter exists yet.
3. Add website metadata editing and exact frontmatter/Markdown preview.
4. Implement a configurable GitHub publisher adapter with mocked integration tests.
5. Add explicit confirmation, create/update flows, commit tracking, canonical URL tracking, and publication snapshots.
6. Validate a safe end-to-end publish/update against the configured repository.

## Known source-data warning

The old writing-voice repository's sample Unix IDs appear inconsistent with its shown timestamps, and some YAML escaping examples are misleading. Confirm behaviour against the current timbenniks.dev repository before locking serializer tests.

2026-09-04 verification: the live source repository is
`timbenniks/timbenniksdev-2024`. Current writing files use optional legacy `id`
and `collection_id` fields, so new publisher output must not depend on them.
Current page code consumes integer `reading_time` strings through
`reading_time.split(" min read")[0]`, so new deterministic output uses
`"<minutes> min read"` and not sample fractional formats. YAML escaping is
handled through the `yaml` package rather than hand-built quoting examples.

The local 2026 replacement site consumes a smaller source contract at
`src/content/writing/<slug>.md`: it derives the slug and all public SEO,
machine-readable, feed, and search outputs. Phase 6 previews both repository
files from one canonical body, but publication attempts and results remain
independently tracked because two GitHub writes cannot be atomic.

## Acceptance criteria

- Output matches the website's real format.
- Publishing creates a valid GitHub commit in the configured path.
- Updating changes the correct existing file.
- Secrets remain server-side.
- Publication records retain the canonical article version, GitHub commit SHA, and URL.
- Existing repository/Vercel integration handles deployment without a redundant trigger.
