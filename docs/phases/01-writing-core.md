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

## Slice 3 validation — 2026-09-01

- Added additive migration `0002_tranquil_celestials.sql` with a non-null integer article revision defaulting existing and new rows to 1.
- Owner-scoped saves now atomically match and increment the expected revision. A stale tab receives a conflict and cannot silently overwrite newer content.
- Added validated, versioned per-article/tab local recovery before a 900 ms autosave debounce, connectivity-aware retry, and protection against late acknowledgements falsely covering newer work.
- Added visible saving, saved, offline, recovered, error, and conflict states. Conflict resolution explicitly reloads the saved copy or keeps the current tab's locally preserved copy.
- A real authenticated Chromium flow passed normal autosave, immediate-refresh recovery, offline editing/retry, two-tab conflict detection, and explicit conflict resolution. The final pooled database read matched revision 6, document metadata version 1, and the expected plain-text projection.
- Inspected saved and conflict states at 1440 × 1000 and 390 × 844. A revalidation/recovery race found during inspection was fixed by evaluating recovery once per editor mount.
- Passed Drizzle schema validation, ESLint, standalone TypeScript, seventeen unit tests, and the Next.js production build.

Checkpoint approved: GitHub Actions run `33492576830` and Vercel deployment `dpl_A4EA2BWrB8sCGAh6REPGFTbWVUaw` passed. Tim typed without using Save, waited for autosave, reloaded the article successfully in Production, and approved the recovery behavior on 2026-09-01. Slice 4 may begin.

## Slice 4 validation — 2026-09-01

- Added owner-scoped, stale-safe status changes using the existing lifecycle-transition domain rules and a compact valid-next-state selector.
- Added user-owned normalized tags and article assignments with case-insensitive deduplication, input bounds, transactional replacement, and persisted canonical display labels.
- Added deterministic Unicode-aware live word count and reading time derived directly from canonical editor JSON.
- Added immutable labeled manual checkpoints of acknowledged server revisions containing title, Tiptap JSON, plain text, deterministic Markdown, reason, and timestamp.
- Generated and applied additive migration `0003_solid_betty_brant.sql` for `tags`, `article_tags`, and `article_versions`; verified all three tables and the complete test record through the pooled runtime connection.
- A real authenticated Chromium flow changed a drafting article to editing, canonicalized `Performance, Next.js, performance` to `Next.js, Performance`, showed ten words and a one-minute read, created a labeled checkpoint, reloaded, and retained every value.
- Inspected the workflow at 1440 × 1000 and 390 × 844. The metadata strip now remains single-row on desktop and wraps into two readable rows on phones.
- Passed Drizzle schema validation, ESLint, standalone TypeScript, twenty-one unit tests, and the Next.js production build.

Checkpoint approved: GitHub Actions run `33505029706` and Vercel deployment `dpl_8TRMjj4vWmFbMMG7jNXEWmGJTG94` passed. Tim validated the complete writing-organization workflow in Production on 2026-09-01. Slice 5 may begin.

## Slice 5 validation — 2026-09-01

- Added a versioned, Zod-validated theme contract for typography, editor width, colours, density, and sidebar treatment.
- Added five immutable starters—Quiet, Paper, Night, Terminal, and Manuscript—with instant in-workspace switching.
- Added owner-scoped custom-theme duplication, editing, saving, deletion, favourites, and a per-user default without coupling theme mutations to article saves.
- Added focus mode through the header control and ⌘/Ctrl-Shift-F; it removes both sidebars while keeping the editor, save state, and document mounted.
- Generated and applied additive migration `0004_pretty_smiling_tiger.sql` for themes and per-user preferences. The migration ran through the direct URL; pooled reads confirmed five valid version-1 starters.
- A real authenticated Chromium flow switched to Night, verified sidebar treatment, entered/exited focus mode, duplicated Quiet, edited and persisted a custom name/740 px width/default/favourite, reloaded, then deleted the test theme and returned cleanly to Quiet.
- The exact article title, body, save state, and revision remained unchanged through all theme operations. Inspected at 1440 × 1000 and a fresh 390 × 844 load with no horizontal overflow or title clipping.
- Passed Drizzle schema validation, ESLint, standalone TypeScript, twenty-four unit tests, and the Next.js production build.

Checkpoint: GitHub Actions run `33506453953` and Vercel deployment `dpl_CkS4T7dPSEHtkcx66GPMiAQ8E4iD` passed for commit `5094307`. Tim now switches starters, duplicates/edits one custom theme, reloads to confirm the default, and enters/exits focus mode in Production. Do not begin Slice 6 until the workspace workflow is approved.

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
