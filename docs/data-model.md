# Data model

## Conventions

The schema uses Postgres with Drizzle ORM. Table and column names use `snake_case`; TypeScript properties may use `camelCase`. Primary keys are UUIDs. Timestamps are timezone-aware and default to the database clock. Mutable records include `updated_at`.

Every user-owned root includes `user_id`, even during the single-user release. Foreign keys use restrictive deletion by default. Explicit cascades apply only to records that have no meaning outside their parent, such as article tags or archive chunks.

Tiptap JSON is stored as JSONB and validated at the application boundary. Flexible metadata uses JSONB with a Zod schema and a version field where its shape may evolve.

## Phase 0 schema

Phase 0 creates the minimum schema needed to prove authentication, migrations, ownership, and future-safe boundaries.

### `users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `github_account_id` | text | Stable provider account ID, unique |
| `github_login` | text | Current login, case-normalized for checks |
| `name` | text nullable | Display name |
| `email` | text nullable | Server-side identity metadata |
| `avatar_url` | text nullable | Display avatar |
| `created_at` | timestamptz | Creation time |
| `updated_at` | timestamptz | Last profile refresh |

If the chosen Auth.js adapter requires standard account/session tables, add `accounts`, `sessions`, and `verification_tokens` using the adapter's compatible schema. Authorization still uses `users.github_account_id`, `github_login`, and the server-side allowlist.

### `articles`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `title` | text | May be empty only during initial creation |
| `slug` | text | Unique per user |
| `status` | enum | Article lifecycle |
| `document_json` | jsonb | Canonical Tiptap document |
| `plain_text` | text | Derived projection |
| `metadata` | jsonb | Versioned core metadata extension |
| `revision` | integer | Monotonic optimistic-concurrency token, defaults to 1 |
| `hero_asset_id` | uuid nullable | Added once assets exist |
| `published_at` | timestamptz nullable | Canonical publication time |
| `created_at` | timestamptz | Creation time |
| `updated_at` | timestamptz | Concurrency/autosave time |

Article status values are `idea`, `interviewing`, `drafting`, `editing`, `ready`, `published`, and `archived`. Create indexes on `(user_id, status, updated_at)`, `(user_id, updated_at)`, and a unique index on `(user_id, slug)`.

Phase 0 may create only `users` and enough auth tables if articles are not yet exercised. The initial migration should still establish extensions and enums needed by the planned schema only when safe and useful.

Phase 1 Slice 1 implementation details:

- Blank manual articles begin in `drafting` with an empty title, empty plain-text projection, canonical `{ type: "doc", content: [{ type: "paragraph" }] }` JSON, and metadata `{ version: 1 }`.
- The application generates the UUID before insertion and uses `untitled-<uuid>` as the collision-safe initial slug. A blank title is rendered as `Untitled article`; display fallback text is never persisted as authored content.
- Every create/list/reopen operation derives `user_id` from the authenticated server session. Reopen queries constrain both article ID and owner ID.
- Canonical editor JSON uses document version 1 and accepts only the deliberately supported semantic node/mark set. The application normalizes ProseMirror attribute maps to plain JSON before server transport, validates again on the server, and derives `plain_text` in the same owner-scoped save operation.
- Markdown is deterministic but derived on demand; it is not duplicated on the mutable article row. Stable Markdown belongs on immutable versions or publication output when those features arrive.
- Slice 3 saves require the caller's expected `revision` in the same owner-scoped update that increments it. A zero-row update is distinguished as missing ownership or a stale-write conflict; `updated_at` remains display metadata rather than the concurrency token.
- The repository writing importer maps source Markdown into the supported canonical editor vocabulary and derives plain text. It preserves source-marked drafts as `drafting`, treats the other article files as `published`, keeps original slugs and dates, and records the exact original Markdown body in an immutable version with reason `import`. The section `index.md` is navigation rather than an article and is not imported.
- Import replacement is deliberately dry-run-first, owner-scoped, transactional, and requires the direct database URL. It replaces articles, their versions, tags, and assignments for that owner only; it does not clear users, authentication data, themes, or preferences. These editable article rows do not replace the separate archive-document/chunk model planned for writing memory.

## Writing core tables

### `article_briefs`

Stores every working-brief revision rather than overwriting history.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `article_id` | uuid | Parent article |
| `revision` | integer | Monotonic per article |
| `brief_json` | jsonb | Validated `ArticleBrief` |
| `source` | enum | `user`, `ai`, or `system` |
| `ai_run_id` | uuid nullable | Generating run |
| `created_at` | timestamptz | Revision time |

Unique `(article_id, revision)`; index `(article_id, created_at desc)`.

Phase 2 Slice 4 implements this in additive migration `0007_exotic_enchantress.sql`. Guided creation writes revision 1 from the premise with source `system`; structured interview updates append source `ai` revisions with their run ID; manual edits append source `user` revisions without overwriting prior evidence. Optional short fields are stored as `null` when unknown so OpenAI strict structured output can require every JSON Schema property, while empty collections remain arrays.

### `article_versions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `article_id` | uuid | Parent article |
| `article_revision` | integer | Exact acknowledged source revision |
| `title` | text | Stable title snapshot |
| `document_json` | jsonb | Stable canonical snapshot |
| `plain_text` | text | Stable text snapshot |
| `markdown` | text | Stable deterministic export |
| `reason` | enum/text | Snapshot trigger |
| `label` | text nullable | User-facing name |
| `ai_run_id` | uuid nullable | Related run |
| `created_at` | timestamptz | Snapshot time |

Index `(article_id, created_at desc)`. Versions are immutable.

Migration `0008_sloppy_randall_flagg.sql` adds the optional `ai_run_id` foreign key required by generated-event snapshots. Slice 5 creates the canonical draft and its `Initial AI draft` version from one atomic update CTE; the version stores the exact resulting article revision and generating run, and deleting a run only clears the optional reference.

### `themes`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `user_id` | uuid nullable | Null for built-in themes |
| `name` | text | Display name |
| `settings_json` | jsonb | Validated versioned theme |
| `is_builtin` | boolean | Immutable starter |
| `created_at` | timestamptz | Creation time |
| `updated_at` | timestamptz | Modification time |

### `user_theme_preferences`

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | uuid | Owner; composite primary key with `theme_id` |
| `theme_id` | uuid | Accessible built-in or owner-created theme |
| `is_favorite` | boolean | Per-user favourite state, including starters |
| `is_default` | boolean | At most one true row per user |
| `updated_at` | timestamptz | Preference update time |

Keeping preferences separate lets immutable built-in themes be favourited and selected independently by each user. Theme JSON is parsed at the query boundary before it reaches client CSS variables.

### `tags` and `article_tags`

`tags` contains `id`, `user_id`, `normalized_name`, display `label`, and timestamps with unique `(user_id, normalized_name)`. `article_tags` contains `article_id`, `tag_id`, and `position`, with a composite primary key. Slice 4 replaces assignments in one Neon HTTP transaction after confirming article ownership; tag identity is case-insensitive while the first canonical display label remains readable.

The tags table is also the reusable owner-scoped taxonomy. The editor searches and selects from it, while still allowing a new label to be created and assigned in one save. Taxonomy management exposes usage counts, creation, rename, merge-on-normalized-name-collision, and confirmed deletion. A merge copies non-duplicate assignments before deleting the source tag; deletion intentionally cascades its assignments and never affects article content.

## Conversation and AI tables

### `writing_sessions`

Contains `id`, `user_id`, `article_id`, `type` (initially `article-start`), status, the next durable message sequence, `created_at`, `updated_at`, and optional `completed_at`. Unique `(article_id, type)` prevents two competing article-start histories; owner/update indexes support workspace reads.

### `writing_messages`

Contains `id`, `session_id`, role (`user` or `assistant`), versioned structured content JSON, required plain-text projection, optional AI run reference, sequence number, and `created_at`. Unique `(session_id, sequence)` ensures stable replay. Premise and answer text are stored before generation; a completed assistant message is stored only after its stream finishes and references the related run.

Phase 2 Slice 2 implements both tables in additive migration `0006_long_grim_reaper.sql`. Sessions and messages cascade only with their parent article; AI run deletion clears the optional message reference. The default guided flow creates the interviewing article, session, and premise in one Neon HTTP transaction.

### `ai_runs`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner |
| `article_id` | uuid nullable | Related article |
| `skill_id` | text | For example `interview` |
| `skill_version` | text | For example `v1` |
| `model` | text | Resolved model name |
| `status` | enum | `running`, `succeeded`, `failed`, `cancelled` |
| `input_tokens` | integer nullable | Provider usage |
| `output_tokens` | integer nullable | Provider usage |
| `duration_ms` | integer nullable | Measured latency |
| `outcome_json` | jsonb nullable | Safe structured summary |
| `error_code` | text nullable | Safe diagnostic code |
| `created_at` | timestamptz | Start time |
| `completed_at` | timestamptz nullable | End time |

Do not store API keys or raw secret-bearing headers. Prompt/instruction identifiers belong in safe version metadata. Raw prompt retention, if ever introduced, needs an explicit privacy decision.

Phase 2 Slice 1 implements this as additive migration `0005_far_loners.sql`. `outcome_json` is a versioned safe envelope containing only execution mode, optional provider response/finish identifiers, and structured-validation state. Prompt text, retrieved context, and generated content are deliberately excluded. Owner-scoped query code verifies an optional article belongs to the run owner before insert and finalizes only a matching `running` record.

### `editor_suggestions`

Phase 3 migration `0009_large_quasar.sql` adds owner/article/run references, action and optional instruction, source article revision, canonical document version, the direction-aware Tiptap selection positions, exact original and suggested text, status (`pending`, `accepted`, `rejected`, `superseded`), and creation/resolution timestamps.

Suggestion generation never updates the article. Accept reconstructs the replacement from the saved canonical document and refuses when either the source revision or exact bookmarked passage changed. The article update and outcome transition happen in one guarded database statement; replacements of 1,000 characters or more also create a pre-change article version. Reject changes only the suggestion outcome.

### `article_reviews`

Stores immutable owner/article/run-linked Humanizer and Critic results against an exact source revision. Each row records the review kind, skill version, validated result JSON, and creation time. Humanizer findings use versioned catalog IDs and exact passage quotes. Critic findings may attach to an exact passage or to the article as a whole. Reviews never update canonical prose; a Humanizer rewrite requires a separate explicit request that creates a normal pending editor suggestion.

## Voice and archive tables

### `writing_profiles`

Contains `id`, `user_id`, profile type/version, observations JSON, evidence summary JSON, analysis window dates, source count, status, and timestamps. Profiles are versioned so an AI run can identify which profile it used.

Phase 4 migration `0012_short_lethal_legion.sql` implements article profiles with
positive versions/source counts, a unique owner/type/version, and at most one
active version per owner/type. The initial validated seed remains application code
until Tim approves applying and populating the migration; `article-first-draft/v2`
identifies the first bounded article-guidance contract. Runtime guidance omits the
profile's evidence notes, while stored profile versions retain them for audit and
future refreshes.

### `archive_documents`

Contains `id`, `user_id`, stable source key, title, URL, publication date, body text, optional source markup, tags JSON, source, destination, content hash, metadata JSON, and timestamps. Unique `(user_id, source, source_key)` supports idempotent import.

Phase 4 migration `0010_damp_colonel_america.sql` introduces this table without changing canonical articles. For the timbenniks.dev repository importer, the source filename is the stable key, exact Markdown is retained as source markup, and normalized frontmatter is retained as metadata. Only published files enter writing memory. The content hash covers all imported content and attribution fields, so unchanged rows retain their identity and timestamps while changed rows update in place.

### `archive_chunks`

Phase 4 migration `0011_fat_masque.sql` enables pgvector and adds `archive_chunks`; it is applied to the configured Neon database. Each row contains `id`, `archive_document_id`, ordinal, body text, token count, a nullable 1,024-dimension embedding vector, embedding model and dimensions, content hash, chunk metadata JSON, optional embedding timestamp, and row timestamps. Unique `(archive_document_id, ordinal)` makes deterministic replacement safe. The database requires vector, model, dimensions, and embedding timestamp to be either all present or all absent. Create a pgvector index only after testing the dataset and selected distance metric; premature index tuning adds risk without benefit.

Phase 4 literal search computes a weighted title/body `tsvector` in its owner-scoped
query. With 156 chunks this avoids a premature maintained column and index. Semantic
and literal results retain document and chunk identifiers for attribution; add a
GIN or vector index only after query-plan evidence justifies it.

### `sources` and `article_sources`

`sources` stores user-owned references with type, title, URL, text/notes, metadata, and timestamps. `article_sources` links a source to an article with optional quote, context, and position. This is later work and stays separate from imported archive memory.

## Variant and publishing tables

### `publication_variants`

Contains `id`, `article_id`, destination, content JSON, metadata JSON, `generated_from_version_id`, status, has-manual-edits flag, content hash, timestamps, and optional publication time. A variant is stale when its source version is not the canonical article's current relevant version/hash; compute this through a tested domain function rather than an unreliable mutable flag alone.

### `publications`

Contains `id`, `article_id`, `variant_id`, publisher ID, status, external ID, external URL, external path, commit SHA, published article version ID, request metadata JSON, safe result metadata JSON, timestamps, and optional error code. Keep prior successful publication records when updates occur or model attempts explicitly so history is auditable.

### `publisher_configs`

Contains `id`, `user_id`, publisher ID, display name, non-secret configuration JSON, credential reference, enabled state, and timestamps. Secrets belong in environment/provider secret storage for V1, not plaintext JSONB. A future encrypted credential store can satisfy the reference.

## Asset tables

### `assets`

Contains `id`, `user_id`, kind, external URL, alt text, caption, credit, provider, provider asset ID, metadata JSON, and timestamps. V1 requires external URLs only. Articles and editor nodes reference assets without assuming Cloudinary.

## Ownership and deletion

Every query begins from the authenticated user or joins through a user-owned root. Server code must not accept `user_id` from client input as authority.

Deleting an article should be recoverable in product behaviour. Prefer an archived/deleted timestamp before physical deletion. If permanent deletion is later added, cascade dependent briefs, messages, suggestions, tags, and variants only after explicit confirmation; retain or redact external publication history according to a documented policy.

## Migration order

1. Required Postgres extensions, lifecycle enums, users, and auth adapter tables.
2. Articles, briefs, versions, themes, tags.
3. Sessions, messages, AI runs, suggestions, profiles.
4. Archive documents, chunks, full-text search, pgvector.
5. Variants, publications, publisher configs, assets, and sources.

Each phase adds only the tables it exercises. Migrations are committed, deterministic, and tested against an empty database. Production migration execution is explicit and completes before code requiring the new schema receives traffic.
