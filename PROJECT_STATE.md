# Project state

Last updated: 2026-09-01

## Current phase

Phase 0 is complete. Phase 1 Slices 1-6 are implemented, tested, and deployed; the final checkpoint remains Tim's comfortable extended Production writing session.

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

## Current validation checkpoint

Have Tim complete one comfortable extended Production writing session before closing Phase 1.

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
- The Neon database was provisioned through Vercel and this workspace has no authenticated Neon CLI or `.neon` branch link. Migrations `0001` through `0004` were therefore reviewed as additive and applied explicitly through the configured direct URL; establish disposable database branches before the first destructive or data-transforming migration.
- Production includes Slice 6 browser coverage through corrective commit `aa57be0`; its final checkpoint is Tim's comfortable extended writing session.

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

## Writing-voice audit findings

- `editorial-rules.md` should seed structured humanizer and critic patterns with IDs, severity, passage findings, and versions.
- `articles.md` should seed weighted voice tendencies. Its fixed article formula and absolute `Concluding` rule must not become mandatory prompts.
- `social.md` should seed destination-specific profiles.
- `blog-structure.md` should seed deterministic serializer/validator tests only after comparison with the live website repository.
- The old skill's exactly-five-question interview directly conflicts with the dynamic interview required by this product and will not be reused.
- Sample Unix timestamps and YAML escaping in `blog-structure.md` require verification before Phase 6.

## Next tasks

1. Have Tim complete one extended Production writing session, including reload and focus/theme switching.
2. After approval, close Phase 1 and begin Phase 2's premise-first AI-assisted start.
