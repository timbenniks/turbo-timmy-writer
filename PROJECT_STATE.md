# Project state

Last updated: 2026-08-31

## Current phase

Phase 0: foundation. Slices A-D are complete. Slice E (Vercel deployment) is the next checkpoint.

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

## Current validation checkpoint

Deploy the linked Vercel project and validate Production OAuth, Neon connectivity, route protection, and the application shell.

## Known issues and setup state

- The workspace is a Git repository on `main`, tracking `https://github.com/timbenniks/turbo-timmy-writer.git`.
- pnpm 11.25.0 is installed, pinned, and working.
- GitHub CLI 2.98.0 is authenticated as `timbenniks` with repository access.
- GitHub CLI is configured for SSH, but this environment has no usable SSH key/askpass. HTTPS cloning and GitHub API calls work. Use HTTPS for bootstrap or repair SSH deliberately.
- Vercel CLI 59.10.0 is authenticated as `timbenniks`.
- Neon is provisioned, connected, migrated, and reachable.
- Development GitHub OAuth credentials are configured locally and the real login flow passes. Production/Preview credentials exist in Vercel but require deployment-time callback validation.
- The public GitHub repository is `https://github.com/timbenniks/turbo-timmy-writer`.
- ESLint 10 currently breaks the React plugin used by `eslint-config-next` 16.3.3 despite its broad peer range. The official scaffold's deprecated ESLint 9.39.5 line remains until the plugin chain is compatible.
- Preview deployments intentionally have no GitHub OAuth credentials because GitHub OAuth Apps support one callback URL. Local and production use separate applications; choose a preview strategy later only if preview login becomes necessary.
- Local port 3000 belongs to the Hermes WhatsApp bridge. Turbo Timmy Writer is pinned to port 3001, and the Development OAuth App must use `http://localhost:3001/api/auth/callback/github`.

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

1. Deploy through the linked Vercel project.
2. Inspect deployment output and runtime logs.
3. Validate the production sign-in page, GitHub callback, allowed login, sign-out, Neon connectivity, and writing shell.
4. Validate denied login with a non-allowlisted account when practical; automated policy coverage already passes.
5. Run the final Phase 0 quality gate, update docs, and commit the completed phase.
