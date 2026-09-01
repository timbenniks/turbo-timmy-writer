# Phase 1: writing core

## Goal

Make Turbo Timmy Writer useful as a comfortable manual writing application before adding AI.

## Planned slices

1. Add article lifecycle queries, library views, blank article creation, and reopen flows.
2. Add the semantic Tiptap editor and versioned serialization to JSON, plain text, and Markdown.
3. Add local-first recovery, debounced server autosave, optimistic concurrency, and visible save state.
4. Add status controls, tags, word count, reading time, and manual version checkpoints.
5. Add the writing workspace, starter themes, theme editing/persistence, and focus mode.
6. Add unit, integration, and Playwright coverage; test extended writing and recovery manually.

## Slice 1 validation — 2026-09-01

- Implemented the full lifecycle vocabulary and explicit transition/filter rules in framework-independent domain code.
- Generated and applied `0001_busy_tony_stark.sql`: owner-linked articles, canonical JSONB, plain text, versioned metadata, lifecycle enum, timestamps, publication time, and the planned ownership/library indexes.
- Kept runtime reads and writes on the pooled Neon URL and migration execution on the verified direct/unpooled URL.
- Added authenticated, owner-scoped create, list, recent, and reopen operations. User ownership comes only from the server session.
- Replaced mocked writing with real Library, Drafts, Ideas, Published, and Archive views. A blank-article server action persists and redirects into a reopenable workspace.
- Confirmed the authenticated create action returns 303, the resulting record has the expected empty canonical document, reopen returns 200, and malformed/unknown IDs return 404.
- Passed Drizzle schema validation, ESLint, standalone TypeScript, six unit tests, and the Next.js production build.
- Inspected the populated library at 1440 × 1000 and the reopened blank article at 390 × 844.

Checkpoint approved: GitHub Actions and the Git-connected Vercel deployment passed. Tim created and reopened a blank article in Production successfully on 2026-09-01. Slice 2 may begin.

## Key decisions to validate

- Tiptap JSON remains canonical and projections are deterministic.
- A late autosave response cannot overwrite or falsely acknowledge newer work.
- Local recovery handles refresh, network failure, and an open article with a newer server revision.
- Theme settings change chrome and typography without touching the document.

## Acceptance criteria

- Tim can write comfortably for an extended session.
- Refreshing or reopening does not lose acknowledged or locally recoverable writing.
- Theme switching does not alter article content.
- An article reopens from another browser after a server save.
- Tim can create a meaningful version checkpoint.
- The UI reads as a writing app, not an admin dashboard.

## Completion evidence

Record test commands, Playwright results, manual browser checks, migration names, screenshots if useful, and any deferred problems in `PROJECT_STATE.md`.
