# Project state

Last updated: 2026-09-01

## Current phase

Phase 0 and Phase 1 Slices 1-3 are complete. Phase 1, Slice 4 (status controls, tags, word count, reading time, and manual version checkpoints), is implemented locally and awaiting the Production validation checkpoint.

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

## Current validation checkpoint

Deploy Slice 4 through the connected Git workflow, then have Tim validate status, tags, live metrics, and one durable manual checkpoint in Production before beginning the workspace/theme slice.

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
- The Neon database was provisioned through Vercel and this workspace has no authenticated Neon CLI or `.neon` branch link. Migrations `0001` through `0003` were therefore reviewed as additive and applied explicitly through the configured direct URL; establish disposable database branches before the first destructive or data-transforming migration.
- Production commit `842875a` includes the validated Slice 3 autosave, recovery, offline retry, and optimistic concurrency behavior.

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

1. Commit and push Slice 4, then confirm GitHub Actions and the Git-connected Vercel Production deployment pass.
2. Have Tim change an article status, add tags, confirm live metrics, create a labeled checkpoint, reload, and confirm the values survive in Production.
3. After approval, begin Slice 5 with starter themes, theme persistence/editing, instant switching, and focus mode.
