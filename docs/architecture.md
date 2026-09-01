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
2. The client serializes a local recovery envelope containing article ID, revision timestamp, and document JSON.
3. A debounced, authenticated server operation validates and saves the document and plain-text projection.
4. The response identifies the persisted update so stale responses cannot mark newer content as saved.
5. Local recovery data is cleared only after the matching server revision succeeds.

Use optimistic concurrency through `updatedAt` or an explicit revision token. A later tab must not silently overwrite a newer server document.

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
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  buildInstructions(): string;
  resolveContext?(input: TInput): Promise<WritingContext>;
}
```

The executor validates input, resolves only requested context, selects a centrally configured model, starts an `ai_runs` record, executes or streams, validates structured output where applicable, then completes the run with usage and outcome. Skills do not import UI or publisher code.

AI output can create a first draft when explicitly requested. After a canonical draft exists, transformations create suggestions and never directly change the article.

### Search and memory

`src/search/chunking`, `src/search/embeddings`, and `src/search/retrieval` isolate replaceable algorithms. Full-text search uses Postgres text search. Semantic search uses pgvector. Hybrid ranking combines normalized literal and semantic scores in application/domain code so ranking can evolve.

Archive documents and voice observations remain separate. Retrieved passages carry source metadata and are selected for relevance. Voice observations carry evidence and confidence, not whole archive bodies.

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
- Playwright covers critical user flows with deterministic fixtures and no paid AI calls.
- CI runs formatting/lint checks, typecheck, unit tests, and `next build`. Database integration and browser suites can become separate jobs when their infrastructure exists.

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
