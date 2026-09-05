# Project state

Last updated: 2026-09-05

## Current phase

Phases 0 through 5 are complete and pushed to `main`. The requested full code audit and fixes are pushed in commit `22144e2`, with GitHub Actions run `33902882461` passing and Vercel reporting a successful Production deployment for the same commit. The configured Neon database has all 14 Drizzle migrations applied through `0013_calm_tarantula.sql`, including `writing_profiles`, `publication_variants`, and `publication_variant_versions`. Phase 6 Slices 1 through 4 are pushed through `aaa1756`. Slice 5 has begun locally with an additive publication-attempt schema and deterministic state contract; the new migration is not applied to Neon and no application publication flow invokes the GitHub adapter. No website article has been written or published.

## Completed work

- Read the complete original product specification in `docs/spec.md`.
- Inspected the empty workspace; no application or Git repository existed.
- Audited `timbenniks/timbenniks-writing-voice`, including `editorial-rules.md`, `articles.md`, `social.md`, and `blog-structure.md`.
- Created the implementation-facing product spec, architecture, data model, all phase documents, and repository instructions.
- Recorded the rule that voice material becomes curated seed evidence rather than a runtime dependency.
- Validated that every required document exists and is non-empty, phase headings are present, required project-state sections exist, and the local Markdown link resolves.
- Tim approved the Slice A documentation checkpoint.
- Activated and pinned pnpm 11.25.0 through `packageManager`.
- Scaffolded Next.js 16.3.3 with the App Router, React 19.2.8, TypeScript, Tailwind 4, and a `src/` layout.
- Added shadcn-compatible configuration and a reusable button primitive.
- Added a responsive, writing-first shell with library navigation, a dominant editor, and a collapsible-by-breakpoint assistant.
- Added Zod-backed server environment validation, Vitest 4, a smoke unit test, lint/typecheck/test/build scripts, and pnpm build-script policy.
- Passed `pnpm check`: ESLint, standalone TypeScript, one unit test, and the Next.js production build.
- Rendered and manually inspected the shell at 1440 × 1000 and 390 × 844; no application errors appeared in the browser log.
- Tim approved the Slice B local application checkpoint.
- Created and linked the Vercel project `turbo-timmy-writer` in the `Tim Benniks' projects` scope.
- Provisioned the free `turbo-timmy-writer-db` Neon resource in Frankfurt with Neon Auth disabled and connected it to Development, Preview, and Production.
- Added Drizzle ORM, the Neon serverless driver, schema organization, migration scripts, and the initial `users` migration.
- Applied the initial migration and queried Neon metadata to confirm the public `users` table exists.
- Added stable NextAuth.js 4 GitHub OAuth with JWT sessions, GitHub profile validation, database user synchronization, server-side allowlist checks, protected root routing, sign-in/out UI, and fail-closed missing-configuration behaviour.
- Added distinct Vercel `AUTH_SECRET` values, the `timbenniks` allowlist, and development/production canonical auth URLs without exposing secret values.
- Verified the credential-less state: `/` returns a 307 redirect to `/sign-in`, the sign-in setup screen returns 200, and `/api/auth/providers` returns 503.
- Documented the required local and production GitHub OAuth applications in `docs/auth-setup.md`.
- Passed the post-auth `pnpm check` quality gate: lint, standalone typecheck, three unit tests, and a production build with protected routes classified as dynamic. `pnpm db:check` also passes.
- Completed the Development GitHub OAuth flow on port 3001 and confirmed Neon contains the synchronized `timbenniks` user.
- Confirmed the local provider endpoint advertises `http://localhost:3001/api/auth/callback/github`.
- Initialized Git on `main` and created the public `timbenniks/turbo-timmy-writer` GitHub repository with an HTTPS remote.
- Pushed foundation commit `96ae01f` after confirming ignored secrets and completing a staged secret scan.
- GitHub Actions CI run `33393486442` passed install, lint, typecheck, three unit tests, and production build in 40 seconds.
- Connected the public GitHub repository to the linked Vercel project and deployed a Ready production build at `https://turbo-timmy-writer.vercel.app`.
- Verified production route protection (`/` redirects to `/sign-in`), the sign-in page, CSRF endpoint, and GitHub provider endpoint all respond correctly.
- Exercised the production OAuth start: it redirects to GitHub and advertises the exact callback `https://turbo-timmy-writer.vercel.app/api/auth/callback/github`.
- Changed `AUTH_GITHUB_SECRET` from a readable Vercel Config value to a Vercel Secret for Production and Preview without changing its value.
- Tim completed the real Production GitHub OAuth flow and confirmed the protected writing shell works at the canonical URL.
- Queried Neon after the Production login and confirmed the allowlisted user's `updated_at` advanced to `2026-09-01T08:19:00.283Z`, proving the deployed authentication callback synchronized through the pooled runtime database connection.
- Inspected the Production request logs: sign-in, CSRF, provider, callback, and authenticated-root requests completed successfully. The callback returned the expected redirect and the authenticated root returned 200.
- Passed the final Phase 0 quality gate: Drizzle schema check, ESLint, standalone TypeScript, three unit tests, and the Next.js production build.
- Added the article lifecycle domain with seven validated states, explicit transitions, library-filter mappings, stable untitled slugs, display fallbacks, and focused unit coverage.
- Added the owner-linked `articles` schema and generated migration `0001_busy_tony_stark.sql` with canonical JSONB, plain-text projection, versioned metadata, lifecycle enum, per-user slug uniqueness, and library indexes.
- Verified the migration URL is direct/unpooled, applied the migration successfully, and queried through the pooled runtime connection to confirm all 11 columns and four indexes exist.
- Added owner-scoped create, list, recent, and reopen queries. Resource lookup combines article ID and the authenticated database user ID; malformed and unknown article IDs return 404.
- Replaced the mocked recent writing and document content with the real library, Drafts, Ideas, Published, and Archive views plus an authenticated blank-article server action and reopen workspace.
- Exercised the real local server action with an authenticated session: it returned a 303 to the new article, persisted the canonical empty document in Neon, appeared in Drafts/Recent writing, and reopened successfully.
- Rendered and inspected the populated library at 1440 × 1000 and the reopened article at 390 × 844. The writing-first layout remains calm and usable at both widths.
- Passed the Slice 1 local gate: Drizzle schema check, ESLint, standalone TypeScript, six unit tests, and the Next.js production build with all library and article routes dynamic.
- GitHub Actions run `33488297453` passed the Slice 1 lint, typecheck, six unit tests, and production build in 39 seconds; Vercel deployed commit `136c7cb` successfully.
- Tim created a blank article in Production, returned to the library, reopened it successfully, and approved the Slice 1 checkpoint.
- Added the matched Tiptap 3.30.6 React, ProseMirror, StarterKit, and Image package set using the official Next.js client-only integration pattern.
- Added a version-1 canonical document boundary with strict node/mark validation, document depth/node/text limits, safe link/image protocols, JSON normalization for ProseMirror attribute maps, and rejection of unsupported formatting.
- Added deterministic plain-text and Markdown serializers covering paragraphs, H2/H3, bold, italic, inline/code blocks, blockquotes, ordered/unordered lists, links, horizontal rules, and external images.
- Added the calm semantic editor with an auto-growing title, limited toolbar, responsive toolbar overflow, visible manual save state, Save button, and ⌘/Ctrl-S shortcut. Strike, underline, H1, arbitrary styling, and base64 images are excluded.
- Added the authenticated explicit save operation. It validates input, derives plain text on the server, updates only the session owner's article, preserves document metadata version 1, and leaves Markdown as an on-demand projection.
- Drove a real authenticated Chromium session through title/body editing, H2 creation, explicit save, database inspection, and reload. Neon retained the exact canonical JSON, title, version metadata, and derived plain text.
- Rendered and inspected the populated editor at 1440 × 1000 and 390 × 844; changed the title control to auto-grow after the first narrow-width inspection exposed clipping.
- Passed the Slice 2 local gate: Drizzle schema check, ESLint, standalone TypeScript, eleven unit tests, and the Next.js production build.
- GitHub Actions run `33490541452` passed the Slice 2 gate in 49 seconds, and Vercel deployed commit `f842847` successfully to the canonical Production URL.
- Tim edited the title and body, used semantic formatting, explicitly saved, reloaded the article in Production, and approved the Slice 2 checkpoint.
- Added an explicit monotonic article revision and generated additive migration `0002_tranquil_celestials.sql`. Applied it through the direct migration URL and queried through the pooled runtime connection to confirm `revision` is a non-null integer with default 1.
- Made owner-scoped saves atomic on article ID, owner ID, and expected revision. Successful writes increment and return the revision; stale writes return the current revision without overwriting newer content.
- Added validated, versioned per-article/tab recovery envelopes in local storage. Every editor change writes locally before the 900 ms server debounce; acknowledged saves clear only the matching recovery copy.
- Added truthful `Saving…`, `Saved`, `Offline changes`, recovery, error, and conflict states. Offline work retries when connectivity returns, ⌘/Ctrl-S remains available, and conflicts require an explicit choice between the saved copy and the current tab's copy.
- Added focused recovery, save-contract, and late-acknowledgement tests. A save response cannot mark the editor saved if a newer local change occurred while that request was in flight.
- Drove a real authenticated two-tab Chromium flow through normal autosave, immediate-refresh recovery, simulated offline editing/retry, a stale tab save, conflict display, and explicit local-copy resolution. The test article advanced from revision 1 to 6, and the pooled database query matched its final title, canonical body projection, and metadata version.
- Visual inspection at 1440 × 1000 and 390 × 844 caught a save/recovery refresh race; recovery is now evaluated once per editor mount and the open editor remains stable across save revalidation. The final saved and conflict layouts are readable at both widths.
- Passed the Slice 3 local gate: Drizzle schema check, ESLint, standalone TypeScript, seventeen unit tests, and the Next.js production build.
- GitHub Actions run `33492576830` passed the Slice 3 gate in 49 seconds, and Vercel deployed commit `842875a` successfully to the canonical Production URL.
- Tim typed without using the Save button, waited for autosave, reloaded the article in Production, and approved the Slice 3 checkpoint.
- Added owner-scoped status mutations that reuse the tested lifecycle-transition rules, reject stale expected statuses, and expose only valid next states in the editor.
- Added normalized user-owned tags and article assignments with a transactional Neon HTTP batch, case-insensitive deduplication, stable display labels, ten-tag/40-character boundaries, and owner-scoped reads and writes.
- Added deterministic Unicode-aware word count and reading time. Metrics update from the canonical editor document immediately and survive recovery/reload without being persisted as duplicate mutable data.
- Added immutable manual article checkpoints containing the acknowledged article revision, title, canonical Tiptap JSON, plain text, deterministic Markdown, reason, optional label, and creation time. The checkpoint control is disabled until autosave has acknowledged the current document.
- Generated and applied additive migration `0003_solid_betty_brant.sql` through the configured direct URL. Pooled runtime inspection confirmed the new `tags`, `article_tags`, and `article_versions` tables.
- Drove a real authenticated Chromium flow through autosave, a valid status transition, duplicate-tag canonicalization, live ten-word/one-minute metrics, labeled checkpoint creation, and reload. Pooled database queries matched status `editing`, tags `Next.js`/`Performance`, article revision 2, and the immutable version's exact title, plain text, Markdown, reason, and label.
- Inspected the complete Slice 4 workspace at 1440 × 1000 and 390 × 844. The first mobile pass hid metrics/checkpoints off-screen; the metadata strip now wraps into two compact rows on phones while remaining a single calm row on desktop.
- Added the app's existing T mark as a route-native SVG icon after browser inspection exposed the otherwise harmless missing-icon resource request.
- Passed the Slice 4 local gate: Drizzle schema check, ESLint, standalone TypeScript, twenty-one unit tests, and the Next.js production build.
- GitHub Actions run `33505029706` passed the Slice 4 gate in 49 seconds, and Vercel deployed commit `549ff07` successfully to the canonical Production URL.
- Tim validated status, tags, live metrics, and a durable manual checkpoint in Production and approved the Slice 4 checkpoint on 2026-09-01.
- Added a versioned, Zod-validated theme model covering typeface, font size, line height, editor width, five appearance colours, density, and sidebar treatment.
- Added five immutable starter themes—Quiet, Paper, Night, Terminal, and Manuscript—and a scoped client workspace provider that switches their CSS variables instantly without touching the editor document.
- Added owner-scoped duplication, custom-theme editing/saving/deletion, per-user favourites, and one persisted default. Built-in theme records remain immutable; per-user state lives in a separate preference table.
- Added focus mode with a visible header control, ⌘/Ctrl-Shift-F shortcut, Escape exit, and responsive chrome removal that keeps the article editor mounted.
- Generated and applied additive migration `0004_pretty_smiling_tiger.sql` through the direct URL. Pooled inspection confirmed exactly five valid version-1 built-in themes.
- Drove an authenticated Chromium flow through Night switching, minimal sidebar styling, focus mode, custom duplication/edit/default/favourite persistence, reload, and deletion. The test theme was removed afterward and preferences returned to a clean fallback state.
- Confirmed the Slice 4 test article retained revision 2, its exact title and exact ten-word plain text throughout theme operations. Inspected at 1440 × 1000 and 390 × 844 with no horizontal overflow or title clipping.
- Passed the Slice 5 local gate: Drizzle schema check, ESLint, standalone TypeScript, twenty-four unit tests, and the Next.js production build.
- GitHub Actions run `33506453953` passed the Slice 5 gate in 59 seconds, and Vercel deployment `dpl_CkS4T7dPSEHtkcx66GPMiAQ8E4iD` for commit `5094307` reached Ready on the canonical Production URL.
- Tim's first Production check caught Night squeezing full sidebar contents into its minimal column. Reworked minimal treatment as a deliberate 72 px icon rail: accessible icon controls remain, recent writing and text labels hide, and measured navigation content stays within 71 px at 1024, 1200, 1280, and 1440 px.
- Corrective commit `17a9050` passed GitHub Actions run `33507199048` in 46 seconds; Vercel deployment `dpl_CFmkUcy9mv3QZqTNrUfyVQLXQLBC` reached Ready and owns the canonical Production alias.
- Replaced the misleading disabled starter form with protected-theme guidance and `Duplicate to customise`. Custom theme fields now live-preview name, typography, width, all five colours, density, and sidebar without persisting until Save; close, Escape, or theme switching discards the draft.
- Authenticated Chromium verified immediate `#203040` canvas and 640 px editor previews, close-to-discard, saved/default persistence across reload, and custom-theme deletion. Removed the automation copy afterward; pooled reads show exactly five built-ins, zero preferences, and the untouched test article at revision 2.
- Live-preview commit `e65d5e0` passed GitHub Actions run `33508060371` in 51 seconds; Vercel deployment `dpl_73RyfFeceY4VDeMjbHZXooQXpHGV` reached Ready on the canonical Production alias.
- Tim validated Night's corrected rail and live custom-theme workflow in Production and approved the Slice 5 checkpoint on 2026-09-01.
- Added Playwright 1.62 with deterministic desktop and 390 × 844 projects, a system-browser fallback, retained failure traces, and one-worker execution to avoid Chromium profile/process instability.
- Added always-on, credential-free browser checks for protected-route redirects and safe auth errors. Added opt-in authenticated tests for autosave/reload/restore and theme/focus prose invariance, with ignored session storage and a designated test article.
- Added a safe local auth-state recorder and browser-test instructions. No authenticated state, OAuth secret, or database credential enters Git or CI.
- Authenticated Playwright round-tripped 1,200 words through autosave/reload at both widths, restored and reloaded the exact original in `finally`, and passed all eight scenarios. Credential-free mode passed four scenarios and skipped the four auth-required cases.
- Passed the complete Slice 6 local gate: Drizzle schema check, ESLint, standalone TypeScript, twenty-four unit tests, Next.js production build, and both Playwright modes.
- The first clean CI browser pass found an ambiguous locator because Next.js adds an empty route-announcer alert. Corrective commit `aa57be0` targets the exact visible message; GitHub Actions run `33509578244` then passed in 56 seconds with four browser passes/four intentional auth skips, and Vercel deployment `dpl_C5LW7xjtdpFcRzzsJWMwVkCaf1hp` reached Ready.
- Added a dry-run-first, owner-scoped Markdown importer for `timbenniks/timbenniksdev-2024/content/4.writing`. Replacement mode requires the direct database URL and deletes/reinserts article data in one transaction while leaving users, authentication, starter themes, and preferences untouched.
- Replaced the 10 existing working/test articles with 82 source articles: 79 Published and three source-marked drafts. The import retained original titles, slugs, dates, canonical editor JSON, plain-text projections, 95 normalized tags, and all 477 article-tag assignments.
- Created one immutable `import` checkpoint per article containing the exact original Markdown body. Database verification found 82 valid editor documents, 82 byte-matching source checkpoints, and zero orphaned tag assignments.
- Added two focused import-conversion tests and passed ESLint, standalone TypeScript, 26 unit tests, and the production build after the import tooling change.
- Converted the writing shell from page-height growth to a dynamic-viewport app frame. Navigation/editor footers, headers, toolbars, and assistant chrome stay visible; only the library body or article canvas scrolls. The authenticated 1,200-word flow passed all eight desktop/mobile scenarios and explicitly verified that the editor footer remains visible at the bottom of the scrolled canvas.
- Hardened authenticated browser coverage to require a disposable single-paragraph article titled with the `Playwright fixture` prefix before any mutation. This prevents the plain-text restore mechanism from being pointed at authored rich content.
- Promoted the existing tags table into a reusable owner taxonomy without a migration. Replaced comma-separated article tag editing with a searchable multi-select and create-on-demand flow; added a real cog-powered manager with usage counts, create, rename, merge-on-collision, and confirmed deletion.
- Consolidated the sidebar account controls into one row: the functional taxonomy cog, `@timbenniks`, and logout align together. Night's 72 px minimal rail stacks only its icon actions to stay within the deliberate narrow treatment.
- Authenticated Playwright passed ten desktop/mobile scenarios, including taxonomy selection/clear, manager create/rename/delete, account-row alignment, and fixed-footer scrolling. Cleanup returned Production data to exactly 82 articles, 95 tags, and 477 assignments.
- Tim's repeated Production checks covered real editing, autosave/reload, themes, focus mode, taxonomy, and responsive layout; his direction to continue on 2026-09-01 closes the Phase 1 acceptance checkpoint.
- Added a provider-neutral AI runtime with versioned skill metadata, explicit model purposes, Zod-validated inputs/context/structured outputs, streamed text execution, and safe failure/cancellation semantics.
- Centralized interview, draft, edit, review, and embedding model selection behind environment-backed configuration. The runtime itself never receives or logs the OpenAI credential.
- Added a deterministic mock provider and eight focused tests covering configuration, preflight validation, successful structured and streamed work, parse failure, provider failure, and abandoned-stream cancellation without paid calls.
- Generated additive migration `0005_far_loners.sql` for `ai_runs`, applied it through the verified direct URL, and confirmed through the pooled runtime URL that all 14 columns and four statuses exist with zero synthetic rows.
- Passed the Slice 1 local gate: Drizzle schema validation, ESLint, standalone TypeScript, 35 unit tests, the production build, and four credential-free desktop/mobile Playwright checks with six authenticated fixture-dependent checks intentionally skipped.
- AI runtime commit `a7fbdd8` passed GitHub Actions run `33526595600` in 1m12s. Vercel deployment `dpl_ETgNE3MN7p91DzMpgwGAgf4TLxHm` reached Ready and owns the canonical Production alias; Production `/` still redirects to sign-in and the configured provider endpoint returns 200.
- Replaced the default blank-article action with a protected premise screen while keeping blank creation as an explicit secondary option. Guided creation persists the interviewing article, active article-start session, and premise message together before any AI call.
- Added additive migration `0006_long_grim_reaper.sql` for owner-scoped writing sessions and ordered versioned messages. Applied it through the direct migration URL; pooled inspection confirmed both tables and an initially empty conversation store.
- Added the server-only OpenAI Responses adapter through the Vercel AI SDK with provider storage disabled, a bounded timeout/output, safe errors, and usage metadata. One `OPENAI_MODEL` now supplies all generative purposes unless a purpose override is configured; embeddings remain separate.
- Added `article-interview/v1`, which asks exactly one dynamically selected question, uses no fixed question count, never drafts, and stops asking when Tim requests drafting. Answers are stored before generation; completed questions are stored with their AI run IDs.
- Authenticated Chrome exercised premise creation, live first-question streaming, answer persistence, a specific follow-up, and full conversation replay after reload. The first pass exposed a visibly incomplete response edge case; the skill allowance and persistence guard now prevent truncated turns from being committed. Zero browser errors appeared.
- Removed the two exact disposable QA articles and their four AI runs after validation. Production data returned to 82 articles, zero article-start sessions, and zero writing messages.
- Phase 2 Slices 2–3 local gate passes: Drizzle schema validation, ESLint, standalone TypeScript, 41 unit tests, and the production build.
- Guided-interview commit `6341184` passed GitHub Actions run `33535177840` in 1m22s. Vercel deployment `dpl_CgZSrGPpb6oE3soz2Pm26WTP47Y8` reached Ready on the canonical Production alias with the OpenAI key stored as a Secret and the shared model stored as Config.
- Added the complete validated `ArticleBrief` boundary and deterministic premise-only revision 1. Optional short fields use explicit nulls to satisfy OpenAI strict JSON Schema without inventing absent content.
- Added immutable `article_briefs` with system/AI/user sources and optional run linkage in additive migration `0007_exotic_enchantress.sql`. Applied it through the direct URL and confirmed all seven columns through the pooled runtime URL.
- Added structured `article-brief-update/v1`. It preserves premise and uncertainty, admits only Tim's words as evidence, and returns a whole validated brief after each answered interview turn.
- Added Conversation/Brief tabs and a full manual editor. Manual Save appends an owner-scoped revision and detects stale expected revisions instead of overwriting newer AI or user work.
- A focused provider probe caught OpenAI's requirement that every strict response-schema property be required. Required nullable optional fields now pass live structured generation; no paid calls occur in automated tests.
- Authenticated browser QA proved system revision 1, AI-linked revision 2, manual revision 3, exact reload persistence, and zero fresh-tab browser errors. Exact fixture cleanup returned to 82 articles and zero conversations/briefs.
- Phase 2 Slice 4 current gate passes Drizzle schema validation, ESLint, standalone TypeScript, and 44 unit tests.
- Brief commit `7946398` passed GitHub Actions run `33536313416` in 1m26s; Vercel deployment `dpl_4hSqBBPq4hyVT2x6wGzPNNQhU1RL` reached Ready on the canonical Production alias.
- Added `article-first-draft/v1` with explicit authorship/evidence constraints and a deterministic Markdown-to-Tiptap boundary. The model supplies prose; tested code extracts the title and canonical supported editor document.
- Added guarded single-use draft generation for an untouched interviewing article. The editor previews streamed canonical content read-only, suppresses autosave/recovery during generation, and restores its exact pre-stream state on failure.
- Added one atomic completion statement that updates the canonical article/status/revision, creates `Initial AI draft` with the exact run, and completes the writing session. Migration `0008_sloppy_randall_flagg.sql` adds `article_versions.ai_run_id` and is applied/verified.
- Browser QA used the premise-only stop path and produced a 7,529-character draft. A fresh tab restored title/body, conversation, brief, Draft saved state, and no errors. Exact database reads confirmed the AI-linked checkpoint and completed session.
- The first live pass exposed a harmless redundant post-preview autosave revision; streamed editor callbacks are now excluded from autosave so the completion revision remains exact. Exact fixture cleanup restored 82 articles and zero guided-flow records.
- Phase 2 Slice 5 current gate passes Drizzle validation, ESLint, standalone TypeScript, and 47 unit tests.
- Draft commit `8e56452` passed GitHub Actions run `33537323515`; Vercel deployment `dpl_3kgefqkFUYnMpD12NiaES5Vy5d86` reached Ready on the canonical Production alias.
- Replaced the desktop-only assistant with one responsive client instance: an `xl` rail and a smaller-screen overlay drawer. This avoids mounting two interview clients and therefore avoids duplicate automatic first-question requests.
- Authenticated 390 × 844 QA confirmed Conversation and editable Brief access, close/reopen controls, exact premise state, no horizontal overflow, and zero errors. Exact fixture/run cleanup restored the 82-article baseline.
- Added a Vercel-disabled deterministic guided-flow provider and Playwright suite. It signs a short-lived local NextAuth test cookie from ignored configuration, traverses the real runtime/routes/database/editor without OAuth or OpenAI, and deletes each exact fixture in `finally`.
- Deterministic acceptance passed at desktop and 390 × 844: six browser tests passed and six unrelated designated-fixture tests skipped. The flow covered premise persistence, one question, answer/brief revision, explicit draft, canonical editor status/content, reload, and retained conversation.
- Post-suite pooled counts confirmed exact cleanup: 82 articles and zero writing sessions, writing messages, article briefs, or article-skill AI runs.
- Every Phase 2 acceptance criterion now passes. Tim can draft immediately after the first question, the brief is visible/evolving/manual, the resulting draft uses durable intent, and conversation remains available after completion.
- Phase 2 final commit `858e70c` passed GitHub Actions run `33538457443` in 1m31s. Vercel deployment `dpl_cGGwm9JnXzu7W4RwSiinFkPYoFhZ` reached Ready on the canonical Production alias; protected `/start` still redirects unauthenticated requests to sign-in.
- Began Phase 3 with a typed selection boundary that records exact original text, a direction-aware Tiptap bookmark, canonical document version, and current server revision. It rejects cursors, structural/whitespace-only selections, and payloads over 8,000 characters.
- Added a responsive selection bubble menu with Tighten, Clarify, Make sharper, Fix rhythm, Alternative, and a 500-character free-form Ask AI input. Preparing an action does not call AI, autosave, or mutate article prose.
- Added four focused selection tests and authenticated desktop/mobile Playwright coverage. Manual Chrome checks at the default desktop width and 390 × 844 confirmed preset/free-form preparation, internal menu scrolling without page overflow, and exact prose invariance.
- Phase 3 Slice 1 validation passes Drizzle schema validation, ESLint, standalone TypeScript, 51 unit tests, a production Webpack build, and four credential-free desktop/mobile Playwright checks with ten authenticated checks intentionally skipped. The normal Turbopack build reached compilation but its CSS worker could not bind an internal port in this restricted environment; no application compile error was reported.
- Added `article-selection-editor/v1` for Tighten, Clarify, Make sharper, Fix rhythm, Alternative, and bounded free-form transformations. Generation persists an owner/article/run-linked pending suggestion containing the exact original text, suggested text, instruction, source revision, canonical document version, and direction-aware Tiptap bookmark; canonical prose remains unchanged.
- Added anchored original/suggested visual diffs and explicit Accept/Reject controls. Accept reconstructs the exact replacement from the saved canonical document, atomically advances the article and outcome only when both the source revision and passage still match, and marks stale requests superseded. Reject changes only the suggestion outcome. Accepted replacements of at least 1,000 characters create `Before accepted AI edit` checkpoints.
- Converted the audited editorial seed evidence into a curated, versioned Humanizer catalog with stable pattern IDs. `article-humanizer-review/v1` returns only detected issues attached to exact article quotes and never rewrites; `Create rewrite suggestion` is a separate explicit AI request and remains pending until accepted.
- Added `article-critic-review/v1` for claims, repetition, transitions, contradictions, abstraction, generated prose, opening, ending, and evidence. Critic results are immutable, revision-scoped, read-only records; the editor also exposes safe per-article AI run history and individual suggestion outcomes.
- Generated and applied additive migration `0009_large_quasar.sql` for `editor_suggestions`, `article_reviews`, and the four-state suggestion enum. Pooled verification confirmed both tables and cleanup returned them to zero rows.
- Added seven focused model/skill/selection/application tests, bringing the unit suite to 58. Existing runtime tests continue to cover structured parse failure, provider failure, cancellation, and abandoned streams without paid API calls.
- Added a Vercel-disabled deterministic precision-AI Playwright flow. At desktop and 390 × 844 it proves unchanged prose during generation and review, individual Reject, guarded Accept plus reload persistence, Humanizer-before-rewrite, read-only Critic, run/outcome persistence, and superseded handling after a concurrent revision change.
- Manual authenticated browser inspection confirmed the review panel remains inside the fixed workspace, scrolls internally, has zero horizontal overflow at 390 × 844, and emits no console warnings or errors. Exact fixture cleanup restored the 82-article baseline with zero suggestions, reviews, sessions, messages, or briefs.
- Phase 3 local gate passes Drizzle validation, ESLint, standalone TypeScript, 58 unit tests, the normal Turbopack production build, four credential-free browser checks, and deterministic guided/precision acceptance at both widths. All Phase 3 acceptance criteria pass locally.
- Phase 3 completion commit `559e6cf` and the preceding selection commit `3d85812` are pushed to `main`. GitHub Actions run `33874955804` passed install, lint, typecheck, 58 unit tests, four browser checks, and the normal production build in 2m22s.
- Vercel deployment `dpl_EYvVuNMnZNmMXJ675ovM7G3egpBw` reached Ready and owns the canonical Production alias. Production `/` redirects to sign-in, while `/sign-in` and the configured GitHub provider endpoint return 200.
- The first authenticated Production inspection exposed a React hydration warning because the client-rendered `Saved at` time used the host's implicit timezone (UTC during Vercel rendering and Europe/Paris in Tim's browser). Formatting now names `Europe/Paris` explicitly so server and client output is deterministic.
- Began Phase 4 with a separate owner-scoped `archive_documents` schema and additive migration `0010_damp_colonel_america.sql`; canonical article rows remain outside the archive import path.
- Added a dry-run-first timbenniks.dev importer that excludes drafts, preserves title, canonical/fallback URL, publication date, derived body text, exact Markdown, normalized tags, full normalized frontmatter, source, and destination.
- Source filenames provide stable import identity. Deterministic SHA-256 hashes classify inserts, changed updates, unchanged no-ops, and removed source records before an explicit write; unchanged rows keep their IDs and timestamps.
- The current local timbenniks.dev tree passes dry-run parsing with 74 published documents, three skipped drafts, and 95 unique tags. Empty canonical URLs safely fall back to the slug URL, while duplicate canonical URLs remain valid because URL is attribution rather than identity.
- Added an in-memory Postgres migration check. All eleven migrations apply successfully from empty state and produce 14 public tables without touching Neon.
- Tim approved the Phase 4 Slice 1 Neon change on 2026-09-04. Migration `0010_damp_colonel_america.sql` applied successfully through the configured direct connection; pooled verification found all 15 archive columns and the primary, identity, and publication indexes.
- The first archive write inserted 74 published documents and skipped three drafts. Verification found 74 unique source keys and hashes, zero missing bodies or invalid hashes, valid source/destination/metadata on every row, and all 82 canonical articles intact.
- The identical second archive write proved idempotency: zero inserts, updates, or removals, 74 unchanged records, and no movement in the latest archive `updated_at` timestamp.
- Pushed Phase 4 Slice 1 commits `ccb0b34` and `cfe8ec8` to `main`.
- Added versioned deterministic archive chunking with `cl100k_base`, an 800-token target, 100-token overlap, 500–1,000-token bounds for split documents, and whole-document handling for shorter work.
- Added an owner-scoped, dry-run-first archive-memory sync. Chunk upserts preserve unchanged rows, invalidate vectors only when content identity changes, remove obsolete ordinals, and resume embedding from missing or stale cache entries.
- Added a provider-neutral archive embedding contract and a tested OpenAI adapter. It accepts only separately configured `text-embedding-3` models, requests exactly 1,024 dimensions, validates every returned vector, and maps failures to safe bounded errors.
- Added migration `0011_fat_masque.sql`, which enables pgvector and creates `archive_chunks` with deterministic replacement keys and all-or-none embedding cache metadata. The empty-database migration test now verifies both the extension and the exact `vector(1024)` type.
- Read-only chunking validation over all 74 imported documents produced 156 chunks, zero replacement characters, and a 328–987 token range. The 328-token chunk is a whole short document; every chunk from a split document satisfies the 500–1,000-token band.
- Phase 4 Slice 2 commit `bcbc2bb` is pushed to `main`. GitHub Actions run `33882574863` passed install, lint, typecheck, 69 unit tests, four credential-free browser checks, and the production build in 2m8s.
- Vercel deployment `dpl_73cn8iqfvQspJy4BW4SqzabU76UP` reached Ready and owns the canonical Production alias. The protected root still redirects to sign-in and `/sign-in` returns 200.
- Tim approved Phase 4 Slice 2 activation on 2026-09-04. Migration `0011_fat_masque.sql` applied through the direct Neon connection; pooled verification found pgvector `0.8.6`, 12 recorded migrations, an exact `vector(1024)` column, 74 archive documents, and all 82 canonical articles intact.
- The first archive-memory write inserted 156 chunks. Its immediate dry-run repeat found zero inserts, updates, or removals and all 156 rows unchanged.
- Embedded all 156 chunks with `text-embedding-3-small` at 1,024 dimensions using 105,274 input tokens. A second identical run selected zero rows, made zero model calls, and consumed zero tokens.
- Final pooled verification found 156 complete current vectors, 156 unique document/ordinal positions covering all 74 archive documents, zero invalid hashes or token counts, and the unchanged 82-article canonical corpus.
- Added owner-scoped literal, semantic, and hybrid archive retrieval. Hybrid results expose normalized lexical and semantic components plus their explicit weights; active sources can be excluded by document ID or slug.
- Added protected Archive and Search views with source attribution, explicit retrieval modes, ranked passages, and inspectable ranking explanations. Live probes returned useful attributed results and verified active-source exclusion.
- Added a bounded related-writing selector and article-workspace “Have I written this before?” panel. Draft generation receives at most four deduplicated attributed excerpts, keeps archive recall separate from voice guidance, and falls back from semantic to literal retrieval if embeddings are unavailable.
- Inspected Archive and Search at 1440 × 1000 and 390 × 844 plus an article workspace at desktop width. The views have no horizontal overflow or browser errors; the article panel links to the complete memory search.
- Curated the audited article/editorial voice sources into eleven validated observations with evidence and confidence. Rigid formulas and recurring phrases are explicitly non-mandatory, and no runtime request fetches the seed repository.
- Added bounded article voice guidance as a separate `article-first-draft/v2` input alongside selected archive evidence. The provider sees guidance without internal evidence notes; the brief and Tim's supplied facts remain authoritative.
- Added owner-scoped versioned `writing_profiles` in additive migration `0012_short_lethal_legion.sql`. All 13 migrations apply from empty state and produce 16 public tables with pgvector and `vector(1024)` intact; the new migration has not been applied to Neon.
- Began Phase 5 with independently typed website, LinkedIn post, LinkedIn article, and newsletter content/metadata, stable canonical/variant content hashing, explicit stale reasons, and a regeneration guard that protects manual edits.
- Added owner-scoped `publication_variants` with source article version/revision/hash and immutable pre-regeneration snapshots in additive migration `0013_calm_tarantula.sql`. All 14 migrations apply from empty state and produce 18 tables; `0013` is not applied to Neon.
- Added independent versioned destination modules for website, LinkedIn post, LinkedIn article, and newsletter. `article-repurpose/v1` requests only the selected profile, canonical snapshot, and bounded voice guidance and validates destination-specific structured output.
- Added the protected variants workspace with editable typed fields and Markdown, formatting preview, clipboard copy, manual publication URL/state tracking, explicit stale choices, and an article-workspace entry point.
- Added owner-scoped create, manual save, and regeneration operations. Initial generation snapshots its canonical source; regeneration locks both revisions, snapshots the old variant, preserves manual edits unless explicitly confirmed, and never updates the canonical article.
- Completed Phase 5 concurrency and safety coverage for stale calculations, stable hashes, mismatched destinations, manual regeneration confirmation, competing decisions, form round-trips, and HTTP(S)-only URLs. Unsaved local variant edits warn before switching, leaving, or regenerating.
- Completed the repository-wide audit recorded in `docs/code-audit-2026-09-04.md`. Production dependency audit reports no known vulnerabilities; Knip reports no unused files/dependencies/exports; JSCPD finds no TypeScript/TSX/CSS/SQL clones; tracked secret and risky-runtime-pattern scans are clean.
- Audit fixes centralize HTTP(S) URL validation and local AI test-mode validation, add four response security headers, remove framework disclosure, trim 38 unused exports/types, extract tested variant form projection, and harden destination/published-state consistency.
- Activated Phases 4 and 5 in production: pushed through `22144e2`, applied migrations `0012` and `0013`, and confirmed the production alias runs the matching Ready deployment.
- Added the missing production `OPENAI_MODEL_EMBEDDING=text-embedding-3-small` configuration and redeployed the existing Phase 5 artifact. Authenticated hybrid search then returned 10 ranked passages; literal search, Archive, and the variant workspace also passed desktop and 390 x 844 checks without console errors or horizontal overflow.
- Inspected both local website repositories without modifying them. Deterministic Phase 6 output now targets `content/4.writing/<slug>.md` for the Nuxt 2024 site and `src/content/writing/<slug>.md` for the Astro 2026 site, using the latter's canonical 17-tag vocabulary and five-tag cap.
- Added backward-compatible website variant fields for publication date, hero image URL, and canonical tags. Publication readiness validates the complete shared contract and renders the exact Markdown destined for both repositories side by side; previewing does not write to GitHub or change the canonical article.
- Added a configurable server-only GitHub Contents adapter with explicit repository allowlisting, safe input/response validation, bounded requests, UTF-8 Base64 encoding, current-file inspection, optimistic update SHAs, and sanitized provider errors. Seven mocked tests cover create, update, missing files, forbidden targets, conflicts, invalid responses, and timeouts without network access.
- Began Phase 6 Slice 5 with target-specific publication attempts. Additive migration `0014_dazzling_mandarin.sql` and database constraints retain the exact Markdown snapshot, variant revision/hash, canonical source version, operation, repository coordinates, expected blob SHA, terminal commit/blob/URL results, and bounded failure state without conflating the two repository writes.

## Current validation checkpoint

Phase 6 Slice 5 persistence validation passes the complete local gate: `pnpm db:check`; all 15 migrations against empty Postgres with 19 public tables, pgvector, and `vector(1024)` intact; ESLint; standalone TypeScript; 107 tests across 35 files; the production build; Knip with no unused-code findings; `git diff --check`; and four credential-free Playwright checks at desktop/mobile widths.

## Known issues and setup state

- The workspace is a Git repository on `main`, tracking `https://github.com/timbenniks/turbo-timmy-writer.git`.
- pnpm 11.25.0 is installed, pinned, and working.
- GitHub CLI 2.98.0 is authenticated as `timbenniks` with repository access.
- GitHub CLI is configured for SSH, but this environment has no usable SSH key/askpass. HTTPS cloning and GitHub API calls work. Use HTTPS for bootstrap or repair SSH deliberately.
- Vercel CLI 59.10.0 is authenticated as `timbenniks`.
- Neon is provisioned, connected, migrated, and reachable.
- Development and Production GitHub OAuth flows pass for the allowlisted account. Preview OAuth remains deliberately unsupported.
- The public GitHub repository is `https://github.com/timbenniks/turbo-timmy-writer`.
- ESLint 10 currently breaks the React plugin used by `eslint-config-next` 16.3.3 despite its broad peer range. The official scaffold's deprecated ESLint 9.39.5 line remains until the plugin chain is compatible.
- Preview deployments intentionally have no GitHub OAuth credentials because GitHub OAuth Apps support one callback URL. Local and production use separate applications; choose a preview strategy later only if preview login becomes necessary.
- Local port 3000 belongs to the Hermes WhatsApp bridge. Turbo Timmy Writer is pinned to port 3001, and the Development OAuth App must use `http://localhost:3001/api/auth/callback/github`.
- NextAuth.js 4 emits Node's `DEP0169` warning for its legacy `url.parse()` usage during the otherwise successful Production callback. It does not break authentication; reassess when upgrading the auth stack or Node runtime.
- The Neon database was provisioned through Vercel and this workspace has no authenticated Neon CLI or `.neon` branch link. Migrations `0001` through `0005` were therefore reviewed as additive and applied explicitly through the configured direct URL; establish disposable database branches before the first destructive or data-transforming migration.
- Production includes the completed Phase 3 precision-AI workflow through commit `559e6cf`.
- Phase 4 migrations `0010_damp_colonel_america.sql` and `0011_fat_masque.sql` are applied to the configured Neon database. Its 74 archive documents produce 156 cached 1,024-dimension vectors; the imported canonical articles remain outside the archive import/chunk path.
- Phase 4/5 migrations `0012_short_lethal_legion.sql` and `0013_calm_tarantula.sql` are also applied to the configured Neon database. Pooled verification on 2026-09-04 found 14 migration records, 18 public tables, `writing_profiles`, `publication_variants`, and `publication_variant_versions`.
- The live timbenniks.dev website source is `https://github.com/timbenniks/timbenniksdev-2024`, not a repository named `timbenniks/timbenniks.dev`.
- The current timbenniks.dev writing source has 83 non-index Markdown files in `content/4.writing`; the prior 82-article number refers to the previously imported canonical corpus in Turbo Timmy Writer, not the current live source count.
- The local `timbenniksdev-2024` worktree contains unrelated uncommitted `writing/` workspace files and a `package-lock.json` change. They were inspected read-only and preserved.
- `timbenniks-2026` derives slugs from Markdown filenames and derives SEO, Twitter, JSON-LD, feed, search, and public Markdown surfaces; Phase 6 must not duplicate those outputs into source frontmatter.
- The in-app browser had no attached Chrome runtime on 2026-09-05, so authenticated visual inspection of the new website metadata editor and dual preview remains pending. Deterministic component/domain checks and the credential-free Playwright suite pass.

## Important architecture decisions

- Tiptap JSONB is canonical; plain text and Markdown are derived projections.
- Next.js server components are the default; authenticated database work initially uses the Node.js runtime.
- Stable NextAuth.js 4.24.15 was selected because Auth.js v5 remains beta. Sessions are encrypted JWTs; the app synchronizes the allowed GitHub identity to `users` on sign-in.
- Authorization requires both a valid session and a server-side GitHub login allowlist check.
- The first migration includes user ownership but does not expose multi-user features.
- Local recovery is written before debounced autosave, with optimistic concurrency to prevent stale saves.
- AI skills, voice evidence, archive retrieval, and publisher adapters are separate boundaries.
- AI changes to existing prose are stored as reviewable suggestions.
- Variants are derived, editable documents with explicit stale detection and regeneration protection.
- Publishing uses deployed APIs, requires confirmation, and stores external result identifiers.
- AI skills declare versioned metadata and a central model purpose. Provider-neutral executors validate boundaries, log safe metadata without prompts or output, and distinguish success, failure, and cancellation before user-facing AI flows are added.

## Writing-voice audit findings

- `editorial-rules.md` should seed structured humanizer and critic patterns with IDs, severity, passage findings, and versions.
- `articles.md` should seed weighted voice tendencies. Its fixed article formula and absolute `Concluding` rule must not become mandatory prompts.
- `social.md` should seed destination-specific profiles.
- `blog-structure.md` should seed deterministic serializer/validator tests only after comparison with the live website repository.
- The old skill's exactly-five-question interview directly conflicts with the dynamic interview required by this product and will not be reused.
- Phase 6 verification against `timbenniks/timbenniksdev-2024` confirmed Unix IDs are legacy optional fields rather than required publication data, and YAML apostrophes should be handled by a serializer rather than hand-escaped examples.

## Next tasks

1. Add website metadata editing and side-by-side exact Nuxt 2024/Astro 2026 Markdown previews.
2. Add the configurable GitHub publisher adapter only after preview validation is in place; keep all external writes confirmation-gated and track each repository result separately.
3. Add create/update flows, commit/canonical tracking, and safe partial-failure retries before an end-to-end publication test.
