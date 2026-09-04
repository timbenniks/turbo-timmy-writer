# Phase 6: website publishing

## Goal

Publish and update timbenniks.dev articles through a validated GitHub API adapter.

## Planned slices

1. Inspect the live website repository and confirm its actual content schema and deployment behaviour. In progress: verified findings are recorded in [`../website-publishing-research.md`](../website-publishing-research.md).
2. Implement and unit-test slugging, reading time, canonical URLs, YAML serialization, metadata duplication, and field validation. Started locally for deterministic timbenniks.dev output only; no GitHub write adapter exists yet.
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

## Acceptance criteria

- Output matches the website's real format.
- Publishing creates a valid GitHub commit in the configured path.
- Updating changes the correct existing file.
- Secrets remain server-side.
- Publication records retain the canonical article version, GitHub commit SHA, and URL.
- Existing repository/Vercel integration handles deployment without a redundant trigger.
