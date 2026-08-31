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
