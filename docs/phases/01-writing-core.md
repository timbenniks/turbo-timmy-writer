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

## Slice 2 validation — 2026-09-01

- Installed a matched Tiptap 3.30.6 package set and used the documented Next.js boundary: a focused client component with immediate server rendering disabled.
- Added the version-1 canonical JSON boundary with strict supported-node/mark validation, safe URL rules, bounded input, and plain-object normalization before React server-action transport.
- Added deterministic, fixture-tested plain-text and Markdown projections. Plain text persists alongside canonical JSON; Markdown remains derived on demand.
- Added editable title/body UI for paragraphs, H2, H3, bold, italic, inline code, code blocks, blockquotes, ordered/unordered lists, links, horizontal rules, and external images. Arbitrary visual formatting is unavailable.
- Added authenticated, owner-scoped explicit saving through the Save button and ⌘/Ctrl-S. Autosave and local recovery remain deliberately out of scope until Slice 3.
- A real authenticated Chromium flow typed a title, paragraph, H2, and second paragraph; Save persisted the exact versioned JSON and derived plain text, and a reload reconstructed the same editor document.
- Passed Drizzle schema validation, ESLint, standalone TypeScript, eleven unit tests, and the Next.js production build.
- Inspected the editor at 1440 × 1000 and 390 × 844. The mobile pass caught and resolved title clipping with an auto-growing title field and hidden toolbar scrollbar.

Checkpoint approved: GitHub Actions run `33490541452` and the Git-connected Vercel deployment passed. Tim edited the title and body, used semantic formatting, explicitly saved, and reloaded the article successfully in Production on 2026-09-01. Slice 3 may begin.

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
