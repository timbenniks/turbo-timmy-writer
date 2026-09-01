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
- Replaced the comma-separated tag field with a searchable multi-select backed by the existing owner taxonomy. Tim can reuse any existing tag, remove selections as chips, or create and assign a new tag without leaving the editor.
- Turned the sidebar cog into a real taxonomy manager with usage counts, create, rename, collision-safe merge, and confirmed deletion. The username and logout action now share the same account row; only the 72 px minimal rail stacks its two icon actions deliberately.
- Authenticated Chromium exercised all taxonomy selection and management operations, restored the disposable article to zero tags, removed its temporary taxonomy entry, and left the imported dataset at 82 articles, 95 tags, and 477 assignments.

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
- The first Production check exposed that Night's 92 px minimal sidebar still rendered full-width labels and visibly crushed them. Replaced it with a deliberate 72 px icon rail that hides only brand/navigation/footer labels and recent-writing text; verified exact 72 px navigation width with no content overflow at 1024, 1200, 1280, and 1440 px.
- Night's corrective commit `17a9050` passed GitHub Actions run `33507199048` in 46 seconds and reached Ready in Vercel deployment `dpl_CFmkUcy9mv3QZqTNrUfyVQLXQLBC` on the canonical Production alias.
- Replaced disabled starter-theme fields with explicit protected-starter guidance and a `Duplicate to customise` action. Custom forms now apply a reversible live preview for all typography, width, colour, density, and sidebar settings; close/Escape/theme switching discards unsaved changes, while Save remains explicit.
- Authenticated Chromium verified an immediate canvas change to `#203040` and editor width change to 640 px, close-to-discard back to Night, save/default persistence across reload, and cleanup back to exactly five starters. The article remained at revision 2 with identical title and plain text.
- Live-preview commit `e65d5e0` passed GitHub Actions run `33508060371` in 51 seconds and reached Ready in Vercel deployment `dpl_73RyfFeceY4VDeMjbHZXooQXpHGV` on the canonical Production alias.

Checkpoint approved: Slice 5, Night's corrected icon rail, and live custom-theme previews are deployed. Tim validated the complete workspace workflow in Production on 2026-09-01. Slice 6 may begin.

## Slice 6 validation — 2026-09-01

- Added a reusable Playwright harness using the installed system Chromium, deterministic single-worker execution, desktop/390 × 844 projects, retained failure traces, and the existing Next.js development server.
- Added CI browser coverage for protected-route redirects and safe unknown-auth-error handling at both widths. These checks use an explicitly empty browser state and require no credentials or database.
- Added opt-in authenticated coverage for autosave/reload/restore plus theme/focus invariance. Auth state lives only in ignored `.auth/`, a recorder script supports safe local renewal, and a designated article ID prevents accidental writes to arbitrary articles.
- Round-tripped a 1,200-word document through autosave and reload on desktop and mobile, restored the original in `finally`, reloaded again, and asserted the exact original title/body. Theme switching and focus mode left prose identical.
- The authenticated suite passed all eight scenarios. The credential-free suite passed four and explicitly skipped four authenticated scenarios, matching CI's security boundary.
- Passed Drizzle schema validation, ESLint, standalone TypeScript, twenty-four unit tests, the Next.js production build, and both Playwright modes.
- The first clean-runner browser pass exposed Next.js's additional empty route-announcer `role="alert"`; the test now targets the exact visible error copy. Corrective commit `aa57be0` passed GitHub Actions run `33509578244` in 56 seconds, including four Playwright passes/four intentional auth skips, and reached Ready in Vercel deployment `dpl_C5LW7xjtdpFcRzzsJWMwVkCaf1hp`.
- The app frame now uses the dynamic viewport height and keeps navigation/editor footers, headers, and toolbars visible while the library or article canvas owns vertical scrolling. The 1,200-word authenticated browser flow scrolls the article canvas to its end and asserts that the editor footer remains in the viewport at desktop and mobile widths.
- Authenticated recovery coverage now refuses to mutate articles whose title does not start with `Playwright fixture`; fixtures must be disposable and single-paragraph because browser text replacement cannot preserve an authored rich document's structure.

Checkpoint: coverage is deployed and the clean CI browser boundary passes. Have Tim complete one comfortable extended writing session before closing Phase 1.

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
