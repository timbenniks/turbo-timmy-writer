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

Complete on 2026-09-06. Additive `sources` and
`article_sources` tables keep Tim's research references separate from imported
archive memory. Validated owner-scoped operations create a source plus article
link, update its citation context, list it deterministically, or unlink it
without touching canonical prose. The editor panel creates, edits, and unlinks
references, shows quotes and context, opens external URLs, and copies a
deterministically formatted citation for Tim to paste explicitly. Migration
`0016_nasty_nico_minoru.sql` is applied to Neon.

Acceptance criteria:

- A source has a bounded type, title, optional HTTP(S) URL, text, and notes.
- Article links retain a bounded quote, context, and deterministic position.
- Every list/update/unlink query proves both article and source ownership.
- Creating a source and its link is one database batch after article ownership.
- Unlinking never silently deletes a reusable source or edits the article.
- The additive migration applies from an empty database with all prior migrations.
- Source management remains separate from the Tiptap editor and never inserts
  copied citations automatically.
- Clipboard failure is reported without losing or changing source data.

Privacy and cost review: source contents remain in the application database and
are not sent to AI, fetched from the supplied URL, or mixed into archive/voice
memory. The slice adds no provider, dependency, or external request.

### Slice 9: installable private offline shell

Complete locally on 2026-09-06. Production builds expose a scoped standalone
web-app manifest and register a tiny dependency-free service worker. When a
navigation loses its connection, the installed app renders an honest offline
fallback; an already open editor continues to use the existing local recovery
envelope and reconnection retry. The worker never caches authenticated pages,
API responses, or article content.

Acceptance criteria:

- The manifest provides local identity, scope, colours, and icon metadata.
- Service-worker registration runs only in production-capable browsers.
- The worker is served uncached with root scope and replaces old shell caches.
- Only the generic offline page and public icon are pre-cached.
- Failed navigations receive the offline page without exposing prior article data.
- Browser coverage proves installation and offline navigation on the production server.

Privacy and cost review: Cache Storage contains only two public shell assets.
No authored content, authenticated response, telemetry, provider call, or new
dependency is introduced. This does not claim cold-start offline editing; local
recovery continues to protect edits in an editor that was already open.

### Slice 10: private usage insights

Complete locally on 2026-09-06. A protected Insights workspace derives writing
volume, 30-day activity, article pipeline, AI run outcomes/tokens/duration,
variant readiness/manual edits, and publication outcomes from owner-scoped
records the product already requires. It adds no tracking event or analytics
provider.

Acceptance criteria:

- Every query is restricted to the authenticated database user.
- Metrics are deterministic, zero-safe, and unit tested with an explicit clock.
- The page clearly identifies metrics as private and derived.
- AI token and timing totals use existing operational metadata only.
- The route fails closed before any metrics query for an unauthenticated user.
- No client tracking script, identifier, cookie, or new database row is added.

Privacy and cost review: calculations run server-side over Tim's existing rows
and render only into his authenticated workspace. No data leaves the database,
no new behavioral history is collected, and there is no provider or dependency
cost.

### Slice 11: portable writing backup

Complete locally on 2026-09-06. The protected Insights workspace can download
a versioned JSON backup containing canonical article Tiptap JSON and Markdown
projections, tags, immutable article versions, editable publication variants,
and exact publication history. Stable ID ordering makes repeated exports easy
to diff. This establishes the payload contract before optional GitHub delivery.

Acceptance criteria:

- Export authentication occurs before any database query.
- Every included row is owner-scoped directly or through its owned article.
- Canonical Tiptap JSON remains present; Markdown is explicitly a projection.
- Tags and arrays use stable ordering, and the filename/date contract is tested.
- The response is a JSON attachment with private `no-store` caching.
- Auth records, credentials, provider configuration, archive embeddings, and uploaded image bytes are excluded.

Privacy and cost review: the generated file contains private authored content,
so it is returned only to Tim's authenticated browser and is never cached by
the app shell. Download is explicit. No external write, model/provider call,
dependency, or new database row is involved.

### Slice 12: ideas, fragments, and research-note inbox

Complete locally on 2026-09-06. The Ideas workspace now has a compact capture
form for an idea, prose fragment, or research note. Every capture immediately
becomes an owner-scoped canonical Tiptap article with `idea` lifecycle status
and an explicit metadata kind, so it can use the normal editor, versioning,
organization, AI tools, and later promotion without conversion.

Acceptance criteria:

- Capture kind, optional title, and body are bounded and server validated.
- Untitled captures derive a deterministic bounded title from the first line.
- Paragraph breaks become supported Tiptap paragraph nodes; plain text is derived.
- The article is created with `idea` status and retains its explicit entry kind.
- The Ideas list displays Idea, Fragment, or Research note instead of hiding the distinction.
- Capture never invokes AI and cannot edit an existing article.

Privacy and cost review: capture writes only the supplied text to Tim's existing
article table. It makes no model or external call, adds no dependency/schema,
and retains the same owner boundary as every canonical article.

### Slice 13: archive relationship explorer

Complete locally on 2026-09-06. The protected Archive workspace links to a
bounded visual explorer that focuses one published source and shows its
strongest shared-tag neighbours. Edges use deterministic Jaccard tag overlap;
the UI exposes the shared tags and percentage and links back to the attributed
source.

Acceptance criteria:

- Nodes come only from the existing owner-scoped archive query.
- Tag comparison normalizes case/whitespace and deduplicates each tag set.
- Node and edge limits explicitly bound quadratic comparison and rendering.
- Edge ordering and four-decimal scores are deterministic and unit tested.
- The graph distinguishes tag overlap from AI similarity or factual dependence.
- Exploring relationships never mutates archive or canonical articles.

Privacy and cost review: graph calculation runs in-process over already stored
archive titles, URLs, and tags. It makes no embedding/model/provider request,
stores no interaction, and adds no dependency or database row.

### Slice 14: Buttondown draft adapter foundation

Complete locally on 2026-09-06. A server-only adapter follows Buttondown's
documented `POST /v1/emails` token-authenticated contract and always requests
`status: draft`. Bounded input, timeout, provider-error mapping, and response
validation are covered with mocked requests. It is not connected to the UI or
publication state until an auditable delivery record can be migrated.

Acceptance criteria:

- The API key is validated from server-only configuration.
- Subject/body inputs are bounded before an external request.
- Requests use Buttondown token authentication, HTTPS, JSON, and a short timeout.
- The adapter requests a draft and rejects any response not validated as a draft.
- Authentication, rate-limit, availability, timeout, and response errors are sanitized.
- Tests make no live provider request and CI needs no Buttondown credential.

Privacy and cost review: this foundation performs no runtime call because no UI
or orchestration invokes it. A future explicit action would send newsletter
subject/body to Buttondown and may incur provider usage, so it must remain
confirmed, draft-only, and auditable.

### Slice 15: Contentstack draft adapter foundation

Complete locally on 2026-09-06. A generic server-only Contentstack Management
API adapter creates an unpublished entry for a configured regional host,
content type, locale, and branch using stack API key plus Management Token.
Field JSON and provider responses are bounded/validated under mocks. Developers
field mapping and durable delivery orchestration remain pending until the real
content-type contract is supplied; the adapter does not guess it.

Acceptance criteria:

- Host, stack key, Management Token, content-type UID, locale, and branch are validated server-side.
- The create-entry request follows the official CMA v3 URL/header/body contract.
- Entry JSON is recursive-safe and limited to 500 kB before the request.
- Authentication/precondition, rate-limit, timeout, availability, and response failures are sanitized.
- Only an entry identity validated from a successful response is returned.
- No publish endpoint, UI call, credential, or live Contentstack request exists.

Privacy and cost review: this foundation performs no runtime call because it is
not orchestrated. Future explicit draft creation would send mapped article
fields to Contentstack and may incur provider usage; publication must remain a
separate confirmed operation with its own audit result.

### Slice 16: LinkedIn Posts API feasibility and adapter

Complete locally on 2026-09-06. Official LinkedIn documentation confirms that
member posting remains practical through the self-serve Share on LinkedIn
product and `w_member_social`. A server-only adapter implements the versioned
`POST /rest/posts` text-post contract for a configured Person URN. Because the
API creates a public post immediately, the adapter is disconnected until an
explicit confirmation and durable audit record are available.

Acceptance criteria:

- Token, numeric Person URN, and explicit `YYYYMM` API version are validated server-side.
- Commentary is trimmed, non-empty, and bounded at 3,000 characters.
- The request uses Bearer auth, REST.li 2.0, version header, public visibility, and published lifecycle.
- Authentication, permission, rate-limit, timeout, availability, and response failures are sanitized.
- Success requires a validated LinkedIn share or UGC-post URN response header.
- No UI path, OAuth token, live request, or automatic LinkedIn publication exists.

Privacy and cost review: the disconnected adapter sends nothing today. Future
use would transmit the confirmed post text to LinkedIn and publish it publicly
in the same call, so explicit confirmation and an auditable immutable snapshot
are mandatory; it must never run during generation or variant save.

## Candidate work

- Richer version comparison and AI annotations
- Command palette and broader keyboard shortcuts
- Improved theme builder
- Hero image and optional Cloudinary integration
- Optional GitHub delivery for the portable backup
- Audited, explicitly confirmed newsletter draft orchestration
- Contentstack Developers field mapping and audited publish orchestration
- Explicitly confirmed and audited LinkedIn publication orchestration

## Planning rule

Do not treat this list as a commitment or pull items into early phases for convenience. Prioritize from real usage after Phase 6. Give each chosen item its own acceptance criteria, privacy/cost review, and coherent implementation slice.

## Completion signal

Phase 7 is an evolving backlog rather than a single release gate. `PROJECT_STATE.md` should identify the active polish objective and its validation evidence.
