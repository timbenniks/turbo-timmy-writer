# Code audit: 2026-09-04

## Scope

The audit covers the complete tracked application after local completion of
Phases 4 and 5. It reviews dependency exposure, secrets, authentication and owner
scoping, external input and links, AI boundaries, concurrency/data-loss guards,
dead code, duplication, and unnecessary complexity.

## Evidence

- `pnpm audit --prod`: no known vulnerabilities.
- Knip: no unused files, dependencies, exports, or exported types after cleanup.
- JSCPD: no exact clones in TypeScript, TSX, CSS, or SQL. Reported duplication is
  confined to generated Drizzle snapshot JSON and is expected migration history.
- Tracked secret scan: no API keys, access tokens, database credentials, or private
  keys; `.env.example` is the only tracked environment file.
- Runtime pattern scan: no `any`, TypeScript suppression, `dangerouslySetInnerHTML`,
  `eval`, dynamic function construction, or runtime child-process execution.
- Every product API route authenticates with `getAllowedSession`; the remaining
  auth route is NextAuth itself. Every product server action authenticates.
- Database query review confirms owner constraints on article, archive, AI,
  taxonomy, theme, and variant reads/mutations. Phase 5 generation additionally
  guards article and variant revisions inside its persistence statement.
- The final gate passes Drizzle history validation, 14 migrations against empty
  Postgres, ESLint without warnings, TypeScript, 88 tests across 32 files, the
  Turbopack production build, and four credential-free browser checks at desktop
  and phone widths.

## Fixes made

- Replaced syntax-only external URL checks with one reusable HTTP(S)-only schema
  across archive import/retrieval, GitHub avatars, variant metadata, and rendered
  publication links.
- Added `nosniff`, clickjacking, referrer, and browser capability headers and
  removed the framework disclosure header. Verified the headers on the local app.
- Centralized and validated the local deterministic AI switch; Vercel cannot use
  the test provider even if the test-mode variable is set accidentally.
- Removed 38 unused public exports/types. The code remains present where needed,
  but internal details no longer masquerade as supported module APIs.
- Extracted destination form projection/validation from the large client component
  and added round-trip and unsafe-URL tests.
- Added warnings for unsaved variant changes before destination switches, page
  exit, and regeneration. Saved manual edits still require the separate server
  confirmation and pre-regeneration snapshot.
- Validate stored destination/content agreement at the database boundary and clear
  the current publication timestamp when a variant returns to draft/ready state.

## Deliberate non-changes

- Major dependency upgrades were not mixed into the feature/audit milestone. The
  production audit is clean; ESLint 10 remains incompatible with the current
  Next.js React lint chain, and TypeScript/Vitest major upgrades need their own
  migration work.
- A strict Content Security Policy needs a nonce-based Next.js design and OAuth/editor
  browser testing. Adding a permissive policy would provide little protection, so
  this audit adds safe independent headers and leaves CSP as a dedicated hardening
  slice.
- Large stateful editor/theme components have no detected clone blocks or unused
  branches. Splitting them without a behavioral need would scatter tightly coupled
  state and increase regression risk.
- Authenticated Phase 5 browser QA awaits explicit approval to apply migrations
  `0012` and `0013` to Neon. The new route is therefore validated by types, unit
  tests, migration replay, route compilation, and existing auth-boundary browser
  checks without changing the external database.
