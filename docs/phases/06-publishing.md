# Phase 6: website publishing

## Goal

Publish and update timbenniks.dev articles through a validated GitHub API adapter.

## Planned slices

1. Inspect the live website repository and confirm its actual content schema and deployment behaviour.
2. Implement and unit-test slugging, reading time, canonical URLs, YAML serialization, metadata duplication, and field validation.
3. Add website metadata editing and exact frontmatter/Markdown preview.
4. Implement a configurable GitHub publisher adapter with mocked integration tests.
5. Add explicit confirmation, create/update flows, commit tracking, canonical URL tracking, and publication snapshots.
6. Validate a safe end-to-end publish/update against the configured repository.

## Known source-data warning

The old writing-voice repository's sample Unix IDs appear inconsistent with its shown timestamps, and some YAML escaping examples are misleading. Confirm behaviour against the current timbenniks.dev repository before locking serializer tests.

## Acceptance criteria

- Output matches the website's real format.
- Publishing creates a valid GitHub commit in the configured path.
- Updating changes the correct existing file.
- Secrets remain server-side.
- Publication records retain the canonical article version, GitHub commit SHA, and URL.
- Existing repository/Vercel integration handles deployment without a redundant trigger.
