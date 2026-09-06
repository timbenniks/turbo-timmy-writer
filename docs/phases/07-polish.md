# Phase 7: polish and advanced workflow

## Goal

Improve speed, confidence, and reach after the core writing-to-publishing workflow is proven.

## Active objective

Make the finished core workflow straightforward to operate before adding more
product surface. This is documentation and operational hardening, not a new
integration.

### Slice 1: operator getting-started guide

Complete locally on 2026-09-06. `GETTING_STARTED.md` now distinguishes existing
Production setup from optional future configuration and covers a new machine,
all validated environment variables, GitHub OAuth, Neon migrations, OpenAI,
least-privilege website publishing, verification, archive maintenance, and
common failure modes. The README links to it.

Acceptance criteria:

- Every application environment variable has a purpose and setup boundary.
- Secret values are never included, and privileged credentials remain
  server-side.
- Destructive database operations are visibly separated from ordinary setup.
- Publishing setup grants only the repository access the adapter needs.
- Commands and local links match the current repository.

Privacy and cost review: documentation introduces no runtime collection,
external calls, or new dependency. Paid embedding commands remain explicit and
the guide labels them before use.

### Slice 2: version comparison and AI provenance

Complete locally on 2026-09-06. Every article now links to a protected history
workspace that compares any immutable checkpoint with another checkpoint or
the current document. The owner-scoped query exposes snapshot metadata and
safe AI provenance—skill, version, model, status, and duration—without prompts
or generated output. A deterministic line diff highlights additions, removals,
unchanged text, and title changes; unusually large inputs use a bounded
fallback instead of unbounded comparison work.

Acceptance criteria:

- Version rows are returned only through article ownership.
- The current article is comparison input, not a silently created snapshot.
- Comparison is deterministic and bounded for large documents.
- AI annotations expose operational provenance without prompt or output data.
- Empty history has a useful state and introduces no document mutation.
- A disposable browser fixture passes at desktop and mobile widths and is
  removed after the test.

Privacy and cost review: comparison reads already stored article/version/run
metadata, makes no model calls, and adds no third-party service or dependency.
Restore remains a separate mutation slice with its own concurrency safeguards.

### Slice 3: protected version restore

Complete locally on 2026-09-06. An immutable checkpoint can be restored only
after browser confirmation. The owner-scoped operation rejects stale article
revisions, checkpoints the current canonical document before replacement,
restores the selected Tiptap snapshot, and records the resulting restored
version. It does not alter lifecycle status, variants, or publication history.

Acceptance criteria:

- Restore requires explicit confirmation and a non-current version ID.
- Article and version ownership are checked server-side.
- A concurrent article revision prevents the restore.
- The current document is snapshotted before any replacement.
- The restored state is itself an immutable version event.
- Desktop and mobile browser tests prove the round trip and clean up their
  temporary rows.

Privacy and cost review: restore makes no external or model call. It creates two
small database snapshots by design so the operation is reversible and auditable.

### Slice 4: keyboard command palette

Complete locally on 2026-09-06. `⌘K` or `Ctrl+K` opens an accessible,
dependency-free command palette from every application shell. It filters stable
navigation, search, current-article history/variants/editor actions, and recent
articles by normalized labels and keywords. Arrow keys move the active result,
Enter navigates, and Escape closes it. Secondary article pages pass only the
lightweight context needed for their article commands.

Acceptance criteria:

- Keyboard and visible triggers open the same labelled dialog.
- Search order and matching are deterministic and tested.
- Commands expose only existing safe routes; no destructive mutation runs from
  the palette.
- Current-article commands work from editor, history, and variants pages.
- Desktop and mobile authenticated browser coverage exercises open, filter,
  and close behavior.

Privacy and cost review: command filtering is entirely local, stores no query,
and introduces no service, dependency, or model call.

### Slice 5: accessible theme builder

Complete locally on 2026-09-06. The existing live-preview theme editor now
calculates WCAG contrast deterministically for primary text, muted text, accent
controls, and selected text. Custom themes show exact failing ratios and cannot
be saved below the defined thresholds. The server action applies the same
validated boundary, so client bypass cannot persist an unreadable theme.

Acceptance criteria:

- Contrast calculation is deterministic and unit tested against the 21:1
  black/white reference.
- Existing valid starter settings remain accepted.
- Invalid custom colours preview locally but cannot be saved.
- Client and server use the same accessible-settings schema.
- Theme edits continue to affect appearance only, never article content.

Privacy and cost review: checks run locally and server-side using submitted
colour values only. No telemetry, external call, or dependency is added.

### Slice 6: canonical external hero images

Complete locally on 2026-09-06. Articles can store one external HTTP(S) hero
image with required alt text and optional caption/credit in versioned canonical
metadata. The inline editor previews, saves, and explicitly removes it through
an owner-scoped optimistic update. Saving advances the canonical revision, so
existing variants become visibly stale; new website variants deterministically
inherit the canonical hero URL without asking AI to invent one.

Acceptance criteria:

- URL, alt text, caption, credit, and removal inputs are bounded and validated.
- The hero update checks ownership and the expected article revision.
- Client bypass receives the same server validation.
- Save/remove advances the editor's known server revision without changing prose.
- Website metadata inherits only a supplied canonical hero URL; other
  destinations remain unchanged.
- No external image or article is uploaded, deleted, or published automatically.

Privacy and cost review: the browser loads only a URL Tim explicitly enters.
The server stores attribution metadata but fetches no image. No provider,
credential, model call, or new dependency is introduced.

### Slice 7: optional managed hero uploads

Complete locally on 2026-09-06. When all three Cloudinary credentials are
configured, Tim can explicitly select a bounded raster image for a signed,
server-side upload. The returned HTTPS URL fills the unsaved hero form; it does
not become canonical until required alt text is added and the existing save
action is explicitly used. Pasting an external URL continues to work without
Cloudinary.

Acceptance criteria:

- Cloudinary credentials are validated together and stay server-side.
- Uploads require authentication and an explicitly selected supported file.
- SVG, empty files, and files above 10 MB are rejected before their bytes are read.
- Provider requests are signed, use HTTPS, time out, and expose only bounded errors.
- Provider responses are validated before their URL reaches the editor.
- Uploading neither auto-saves article metadata nor publishes an article.
- Ordinary prose autosave preserves canonical hero metadata.

Privacy and cost review: an upload sends the selected image to Cloudinary only
after Tim chooses it. Cloudinary may retain and bill for that asset even if the
article form is not subsequently saved. The feature is disabled when its
credentials are absent, makes no model call, and adds no dependency.

### Slice 8: source and citation persistence

Persistence foundation complete locally on 2026-09-06. Additive `sources` and
`article_sources` tables keep Tim's research references separate from imported
archive memory. Validated owner-scoped operations create a source plus article
link, update its citation context, list it deterministically, or unlink it
without touching canonical prose. The editor-facing management panel is the
next sub-slice and will not ship until the migration can be applied safely.

Acceptance criteria for this foundation:

- A source has a bounded type, title, optional HTTP(S) URL, text, and notes.
- Article links retain a bounded quote, context, and deterministic position.
- Every list/update/unlink query proves both article and source ownership.
- Creating a source and its link is one database batch after article ownership.
- Unlinking never silently deletes a reusable source or edits the article.
- The additive migration applies from an empty database with all prior migrations.

Privacy and cost review: source contents remain in the application database and
are not sent to AI, fetched from the supplied URL, or mixed into archive/voice
memory. The slice adds no provider, dependency, or external request.

## Candidate work

- Richer version comparison and AI annotations
- Command palette and broader keyboard shortcuts
- Improved theme builder
- Hero image and optional Cloudinary integration
- Source and citation management UI and citation formatting
- Archive relationships and graph exploration
- Fragments, research notes, and ideas inbox
- GitHub backup/export
- Progressive web app and deeper offline support
- Usage and product analytics
- Newsletter provider adapter
- Contentstack Developers publisher
- LinkedIn API publishing if a reliable supported API is practical

## Planning rule

Do not treat this list as a commitment or pull items into early phases for convenience. Prioritize from real usage after Phase 6. Give each chosen item its own acceptance criteria, privacy/cost review, and coherent implementation slice.

## Completion signal

Phase 7 is an evolving backlog rather than a single release gate. `PROJECT_STATE.md` should identify the active polish objective and its validation evidence.
