# Architecture

## Status

This document records the intended architecture before implementation. Update it when implementation evidence changes a decision. Record material changes in `PROJECT_STATE.md`.

## System shape

Turbo Timmy Writer is a Next.js application deployed on Vercel with Neon Postgres as its durable store. The browser owns interactive editing and local recovery. Next.js server components, route handlers, and server actions enforce authentication and coordinate database, AI, GitHub, and publishing operations.

```text
Browser
  editor, recovery, themes, streamed UI
        |
Next.js on Vercel
  auth, application services, AI runtime, publishers
        |
  +-----+----------------+----------------+
  |                      |                |
Neon Postgres         OpenAI API      GitHub API
records, search,      generation,     OAuth and
pgvector              review          publishing
```

Local `gh` and `vercel` commands bootstrap and operate the project. Deployed code uses supported APIs and credentials, never those command-line tools.

## Architectural boundaries

### Application routes

`src/app` contains routing, layouts, server components, route handlers, and server actions. Route files stay thin and call domain/application services. Interactive surfaces become focused client components.

### Writing domain

`src/components/writing`, `src/components/library`, and application services coordinate article lifecycle, briefs, versions, sessions, and tags. Domain rules such as valid status transitions and version triggers remain independent of React.

### Editor domain

`src/components/editor` contains Tiptap UI. `src/editor/extensions` configures semantic content, while `src/editor/serialization` converts between Tiptap JSON, plain text, and Markdown. The editor never writes directly to Postgres.

Autosave follows this sequence:

1. Tiptap emits a document update.
2. The client serializes a versioned, per-article/tab local recovery envelope containing the article ID, integer server revision, local change revision, title, and document JSON.
3. A debounced, authenticated server operation validates and saves the document and plain-text projection.
4. The response identifies the persisted update so stale responses cannot mark newer content as saved.
5. Local recovery data is cleared only after the matching server revision succeeds.

Optimistic concurrency uses an explicit integer article revision. The owner-scoped update matches the expected revision and increments it atomically; `updatedAt` is display metadata, not a lock. A later tab cannot silently overwrite a newer server document and must explicitly resolve the conflict.

### Database domain

`src/db/schema` contains small schema modules grouped by domain and exported through an index. `src/db/queries` contains typed data access; migrations are generated and committed under `src/db/migrations` or the Drizzle-configured migration directory.

The application uses the Neon serverless driver appropriate for Vercel's runtime and Drizzle ORM. Phase 0 chooses a Node.js runtime for authenticated database routes unless a concrete Edge requirement appears. Migrations run as an explicit deployment/operations step, not on every application boot.

### Authentication and authorization

GitHub OAuth establishes identity. Stable NextAuth.js 4.24.15 is the selected Auth.js integration. Auth.js v5 remains beta as of 2026-08-31, while the maintained stable line explicitly supports Next.js 16 and React 19. A server-side authorization guard compares the normalized GitHub login with `ALLOWED_GITHUB_LOGIN` on sign-in and every protected entry point.

The database user record uses GitHub's stable provider account ID for identity and stores the current login for display/allowlist auditing. Client code receives only safe session fields. Authentication does not imply authorization; server mutations also verify ownership.

### AI runtime

`src/ai/runtime` executes versioned skills and assembles minimal context. `src/ai/skills` owns task-specific schemas and instructions. `src/ai/voice` owns profile observations and evidence. `src/ai/tools` exposes server-only retrieval functions.

```ts
interface WritingSkill<TInput, TOutput> {
  id: string;
  version: string;
  name: string;
  description: string;
  modelPurpose: "interview" | "draft" | "edit" | "review" | "embedding";
  maxOutputTokens?: number;
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  buildInstructions(input: TInput): string;
  buildInput(input: TInput, context: WritingContext): string;
  resolveContext?(input: TInput): Promise<WritingContext>;
}
```

The executor validates input, resolves only requested context, selects a centrally configured model, starts an `ai_runs` record, executes or streams, validates structured output where applicable, then completes the run with usage and outcome. Skills do not import UI or publisher code.

The live OpenAI adapter uses the Responses API through the Vercel AI SDK, disables provider-side response storage, imposes a request timeout, and maps provider failures to bounded safe codes. `OPENAI_MODEL` is the shared generative default; interview, draft, edit, and review may override it independently, while embeddings require an embedding-capable model. CI never supplies a live credential and exercises provider-neutral mocks only.

The article-start route authenticates and owner-scopes the session before accepting input. It stores each user turn first, streams newline-delimited safe UI events from the interview skill, and stores the complete assistant turn with its AI run ID. A visibly incomplete response is not committed as a conversation turn. The client can retry while the already-saved user text remains durable.

Every guided article starts with a deterministic premise-only brief before the first model call. After an answer and its next question are safely stored, a separate structured skill derives the complete next brief from the current revision and conversation. This intentionally keeps archive retrieval, interview phrasing, and brief evidence separate. AI and manual changes append immutable revisions; a failed brief refresh never rolls back the stored conversation turn.

First-draft generation is an explicit action available only while the persisted editor is untouched and the article is `interviewing`. The draft skill streams Markdown; a deterministic boundary extracts one H1 title and converts only supported Markdown into validated canonical Tiptap JSON. The client previews that canonical projection in the disabled editor without autosaving. Completion atomically updates the owner/revision-scoped empty article, creates the AI-linked `Initial AI draft` snapshot, and completes the writing session. Failure restores the pre-stream editor and cannot overwrite prose.

AI output can create a first draft when explicitly requested. After a canonical draft exists, transformations create suggestions and never directly change the article.

### Search and memory

`src/search/chunking`, `src/search/embeddings`, and `src/search/retrieval` isolate replaceable algorithms. Full-text search uses Postgres text search. Semantic search uses pgvector. Hybrid ranking combines normalized literal and semantic scores in application/domain code so ranking can evolve.

Archive documents and voice observations remain separate. Retrieved passages carry source metadata and are selected for relevance. Voice observations carry evidence and confidence, not whole archive bodies.

The Phase 4 repository importer is dry-run-first and owner-scoped. It treats a source filename as stable identity, stores exact Markdown alongside derived plain text, preserves normalized frontmatter, and excludes source-marked drafts. A deterministic content hash drives insert/update/no-op planning; source reconciliation occurs only during an explicit write. Archive imports never mutate canonical article rows.

### Publishing

`src/publishing/adapters` contains destination adapters behind a typed contract. Core article services know about a generic variant and publication record, not GitHub paths, LinkedIn limits, or newsletter fields.

The website adapter performs deterministic transformation and validation before any external write. An explicit preview and confirmation precede GitHub API publication. Idempotent updates use the stored repository path and latest commit/blob information.

## Writing-voice source audit

The `timbenniks/timbenniks-writing-voice` repository was inspected on 2026-08-31. It is seed material and is not a runtime dependency.

Useful concepts are separated as follows:

| Source | New responsibility | Treatment |
| --- | --- | --- |
| `editorial-rules.md` | Editorial principles, humanizer detections, critic checks | Convert useful checks to structured, versioned pattern definitions with passage findings and severity. Detection remains separate from rewriting. |
| `articles.md` | Initial article voice profile | Convert absolutes and the seven-step formula into weighted tendencies with evidence and optional confidence. Do not force structure or recurring phrases. |
| `social.md` | Destination profiles | Seed LinkedIn, short-form, abstract, and newsletter rules as separate configurable destination modules. |
| `blog-structure.md` | Website serializer and validator | Implement field derivation, YAML safety, canonical URLs, reading time, and validation in deterministic tested code. |

The old skill's fixed five-question interview conflicts with this product and will not be reused. Interview completion is dynamic and user-controllable. Likewise, `Always use Concluding` is treated as historical evidence, not a required heading.

The source contains values that require verification before Phase 6: its sample Unix IDs do not appear to match the shown timestamps, and its escaped apostrophe examples are misleading inside YAML double-quoted strings. Website publisher tests will use the actual timbenniks.dev consumer as the source of truth.

## Proposed source tree

```text
src/
  app/
  components/
    ai/
    editor/
    library/
    publishing/
    themes/
    writing/
  db/
    migrations/
    queries/
    schema/
  ai/
    runtime/
    skills/
    tools/
    voice/
  editor/
    extensions/
    serialization/
  publishing/
    adapters/
  search/
    chunking/
    embeddings/
    retrieval/
  lib/
```

Avoid catch-all `utils.ts` modules. Shared functions belong to a named domain or a narrowly scoped `src/lib` module.

## Data flow and consistency

Tiptap JSON is canonical. Plain text and Markdown are projections. On a document save, the server validates the document shape, derives plain text using the versioned serializer, and persists both atomically. Markdown may be generated on demand until a version or publication needs a stable snapshot.

Brief revisions, article versions, AI suggestions, variants, and publications are append-oriented or explicitly stateful records. External publication results are stored only after the provider confirms success. Failed external operations retain a debuggable attempt without marking an article published.

Dates are stored as timezone-aware timestamps. IDs use UUIDs generated by Postgres or the application consistently. User-provided ordering uses explicit ordinal fields rather than relying on insertion order.

## Security

- Validate environment configuration once in a server-only module.
- Never import server credential modules into client bundles.
- Validate external and mutation input with Zod.
- Require a session, allowlisted login, and resource ownership on server operations.
- Treat imported HTML/Markdown and editor links as untrusted input.
- Keep OAuth, OpenAI, GitHub publisher, and database secrets outside logs.
- Protect OAuth callbacks and mutations with framework-standard CSRF/state controls.
- Limit AI input size and external request duration.
- Require an explicit user confirmation for publication.

## Observability

Application errors include a request correlation ID where practical. AI runs retain skill version, model, timing, token counts, status, and parse errors without secrets. Publication records retain provider identifiers, paths, commit SHA, status, and safe error summaries.

Early phases may use Vercel logs. Add a dedicated observability provider only when evidence justifies it.

## Testing boundaries

- Unit tests cover pure state transitions, serializers, settings validation, prompt/output schemas, ranking helpers, and publisher transformations.
- Integration tests cover Drizzle queries against a test database and external adapters through mocks.
- Playwright covers critical user flows with deterministic fixtures and no paid AI calls. Fail-closed auth checks always run in CI; authenticated writing checks require an ignored local storage state and designated test article.
- The guided-flow suite can synthesize a short-lived encrypted NextAuth cookie from ignored local configuration and the one allowlisted database user. Its explicitly selected deterministic provider is disabled on Vercel, exercises the full premise/interview/brief/draft stack, and cleans exact fixtures in `finally` without OAuth or paid calls.
- The same Vercel-disabled provider drives Phase 3 acceptance through real routes and database records. Its disposable suite proves pending prose invariance, individual reject/accept outcomes, accepted-content reload, Humanizer-before-rewrite, read-only Critic output, and stale-revision refusal at desktop and phone widths.
- CI runs lint, typecheck, unit tests, credential-free Playwright checks, and `next build`. Authenticated database/browser suites remain explicit local gates until isolated CI identity and data exist.

## Deployment and environment strategy

Use `.env.example` for names and non-secret documentation. Local secrets live in ignored environment files. Vercel environments receive preview and production values through project settings or CLI after authentication. Neon uses separate branches/databases for production and tests where practical.

Required Phase 0 configuration is expected to include:

```env
DATABASE_URL=
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
ALLOWED_GITHUB_LOGIN=timbenniks
```

OpenAI and publisher variables are documented but not required until their phases. CI builds use safe placeholders only when build-time validation requires them; runtime secrets are never committed.

## Architecture decisions

1. Tiptap JSONB is canonical; projections are derived.
2. Server components are the default rendering model.
3. Authenticated database operations initially use the Node.js runtime.
4. Stable NextAuth.js 4 with GitHub OAuth and JWT sessions handles authentication; the application synchronizes the allowed GitHub identity into its own user table.
5. Missing OAuth configuration fails closed with a setup screen and unavailable auth endpoints.
6. User ownership exists from the first migration without multi-user UI.
7. Local recovery precedes debounced server autosave.
8. AI skills, voice evidence, archive retrieval, and publishers are independent boundaries.
9. Existing writing-voice content is copied as curated seed data later, never fetched at runtime.
10. Publication is previewed, validated, and user-confirmed.
11. Phase acceptance criteria gate later work.
12. Article operations are owner-scoped at the query boundary. Blank articles are created through authenticated server actions with application-generated UUIDs, stable initial slugs, and an explicit versioned empty document.
13. The editor crosses the server boundary as normalized, versioned Tiptap JSON. Server saves validate the supported schema and derive plain text; deterministic Markdown is generated only when a consumer needs it.
14. Slice 3 writes a validated local recovery envelope before a 900 ms server debounce. Server saves use an explicit integer revision; late acknowledgements never claim newer local edits, offline changes retry on reconnection, and stale tabs require explicit conflict resolution.
15. Slice 4 keeps writing metrics derived in deterministic client-safe code, stores tags as normalized user-owned records, and creates manual checkpoints only from an acknowledged server revision. Checkpoints are immutable snapshots rather than autosave history.
16. Slice 5 keeps versioned theme settings and per-user preferences outside articles. Validated settings become scoped CSS variables in a client workspace provider, so switching is immediate and cannot enter the canonical document or autosave path. Focus mode changes workspace chrome without unmounting the editor.
17. Phase 2 starts behind a provider-neutral AI boundary. Skills declare a version and model purpose; the executor validates inputs and resolved context before starting a run, records safe status/usage/outcome metadata, validates structured output, and treats an abandoned text stream as cancelled. Provider prompts and generated content are not retained in `ai_runs`.
18. The default new-article action opens an immediate-persistence premise flow. A durable owner-scoped article-start session replays ordered user and assistant messages. The OpenAI Responses adapter remains server-only, uses `store: false`, and accepts one shared generative model with optional purpose overrides.
19. Working briefs are append-only structured revisions. Revision 1 is deterministic from the saved premise, interview evidence creates an AI-linked revision, and manual changes create user revisions. Nullable optional strings keep the schema compatible with strict provider JSON Schema without inventing absent content.
20. First-draft generation is explicit and single-use for an untouched interviewing article. Streamed Markdown is converted in deterministic code to canonical Tiptap JSON; the final article update, immutable initial-draft version, and session completion share one guarded database statement.
