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

Phase 4 is in progress. Slice 1 adds the separate `archive_documents` boundary and additive migration `0010_damp_colonel_america.sql`, plus a dry-run-first timbenniks.dev importer. The importer reads only published Markdown files, retains exact source markup and normalized frontmatter metadata, derives plain body text, and keys records by source filename. A SHA-256 content hash makes unchanged imports no-ops; changed records update in place and records removed from the source set are removed only during an explicit `--write` run.

Focused tests cover parsing, draft exclusion, URL fallback, hashing, and deterministic insert/update/unchanged/removal planning. The actual local source tree passes inspection with 74 published documents, three skipped drafts, and 95 unique tags. All eleven migrations pass against an empty in-memory Postgres database. The complete local gate passes ESLint, standalone TypeScript, 62 unit tests across 22 files, and the normal Turbopack production build.

Tim approved the Neon change on 2026-09-04. Migration `0010` applied successfully through the direct connection and pooled verification found all 15 columns and three expected indexes. The first import inserted 74 documents; the identical second pass reported zero inserts, updates, or removals and 74 unchanged documents. Verification found 74 unique source keys and hashes, zero missing bodies or malformed hashes, valid attribution/metadata on every row, an unchanged import timestamp, and the existing 82 canonical articles intact.

Next: add replaceable chunking and cached embeddings in a separate archive layer.
