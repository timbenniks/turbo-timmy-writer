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
