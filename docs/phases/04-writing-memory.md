# Phase 4: writing memory

## Goal

Turn Tim's published archive into searchable context while keeping voice evidence separate.

## Planned slices

1. Build an idempotent timbenniks.dev importer with parsing, content hashes, and source metadata.
2. Add replaceable chunking and cached OpenAI embeddings in pgvector.
3. Add literal, semantic, and hybrid search with observable ranking.
4. Add Archive and Search UI plus a related-writing panel.
5. Expose server-side retrieval to AI and add `Have I written this before?`.
6. Curate a versioned initial voice profile from the audited voice repository.

## Key decisions to validate

- Changed imports update only changed documents/chunks.
- Retrieval returns passages with source attribution and excludes the active article when requested.
- Hybrid scores are understandable and replaceable.
- Voice profile observations carry evidence and confidence rather than mandatory templates.

## Acceptance criteria

- Published writing appears in the app.
- Literal and semantic search both return useful results.
- Guided article creation surfaces related prior work.
- AI receives selected excerpts rather than the complete archive.
- Voice and archive retrieval remain separate architectural concerns.

## Current checkpoint

Phase 4 is in progress. Slice 1 adds the separate `archive_documents` boundary and additive migration `0010_damp_colonel_america.sql`, plus a dry-run-first timbenniks.dev importer. The importer reads only published Markdown files, retains exact source markup and normalized frontmatter metadata, derives plain body text, and keys records by source filename. A SHA-256 content hash makes unchanged imports no-ops; changed records update in place and records removed from the source set are removed only during an explicit `--write` run. Slice 1 commits `ccb0b34` and `cfe8ec8` are pushed to `main`.

Focused tests cover parsing, draft exclusion, URL fallback, hashing, and deterministic insert/update/unchanged/removal planning. The actual local source tree passes inspection with 74 published documents, three skipped drafts, and 95 unique tags. All eleven migrations pass against an empty in-memory Postgres database. The complete local gate passes ESLint, standalone TypeScript, 62 unit tests across 22 files, and the normal Turbopack production build.

Tim approved the Neon change on 2026-09-04. Migration `0010` applied successfully through the direct connection and pooled verification found all 15 columns and three expected indexes. The first import inserted 74 documents; the identical second pass reported zero inserts, updates, or removals and 74 unchanged documents. Verification found 74 unique source keys and hashes, zero missing bodies or malformed hashes, valid attribution/metadata on every row, an unchanged import timestamp, and the existing 82 canonical articles intact.

Slice 2 adds versioned, deterministic `cl100k_base` chunking, an idempotent dry-run/write sync, a provider-neutral embedding boundary, and an OpenAI adapter that requests and validates 1,024-dimension vectors. Additive migration `0011_fat_masque.sql` enables pgvector and adds replaceable archive chunks with nullable cache metadata. Changed content invalidates only its affected cached vector; retries select only missing, stale-model, or stale-dimension rows. Tests use mocks and a fake HTTP boundary, so validation makes no paid API calls.

Read-only validation over the 74 imported documents produces 156 chunks with no replacement characters. Token counts range from 328 for a whole short document to 987; every chunk belonging to a split document stays within the planned 500–1,000-token band. All 12 migrations apply from empty state with pgvector enabled and a verified `vector(1024)` column. Migration `0011` has deliberately not been applied to Neon and no archive embedding request has been made.

The complete Slice 2 local gate passes Drizzle migration-history validation, the empty-database migration test, ESLint, standalone TypeScript, 69 unit tests across 25 files, and the normal Turbopack production build.

Next: after explicit approval, apply migration `0011`, write the 156 deterministic chunks, and populate their embedding cache. Then add literal, semantic, and observable hybrid retrieval as Slice 3.
