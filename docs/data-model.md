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

### `article_versions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `article_id` | uuid | Parent article |
| `document_json` | jsonb | Stable canonical snapshot |
| `plain_text` | text | Stable text snapshot |
| `markdown` | text nullable | Stable derived export when needed |
| `reason` | enum/text | Snapshot trigger |
| `label` | text nullable | User-facing name |
| `ai_run_id` | uuid nullable | Related run |
| `created_at` | timestamptz | Snapshot time |

Index `(article_id, created_at desc)`. Versions are immutable.

### `themes`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `user_id` | uuid nullable | Null for built-in themes |
| `name` | text | Display name |
| `settings_json` | jsonb | Validated versioned theme |
| `is_builtin` | boolean | Immutable starter |
| `is_favorite` | boolean | User preference for custom records |
| `created_at` | timestamptz | Creation time |
| `updated_at` | timestamptz | Modification time |

User settings store `default_theme_id`; if a separate settings table is unnecessary initially, add that nullable reference to `users` after themes exist.

### `tags` and `article_tags`

`tags` contains `id`, `user_id`, normalized `name`, display `label`, and timestamps with unique `(user_id, name)`. `article_tags` contains `article_id`, `tag_id`, and optional `position`, with a composite primary key.

## Conversation and AI tables

### `writing_sessions`

Contains `id`, `article_id`, `type` (initially `article-start`), status, optional title, `created_at`, and `updated_at`. Index sessions by article and update time.

### `writing_messages`

Contains `id`, `session_id`, `role`, structured content JSON, optional plain text, optional AI run reference, sequence number, and `created_at`. Unique `(session_id, sequence)` ensures stable replay.

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

### `ai_suggestions`

Contains `id`, `article_id`, optional `article_version_id`, optional `ai_run_id`, original text, suggested text, instruction, location anchor JSON, status (`pending`, `accepted`, `rejected`, `superseded`), and creation/resolution timestamps.

Location anchors must tolerate document edits. The original text plus a structural selection/bookmark is preferable to raw numeric offsets alone. Accept operations verify that the intended source text still matches before applying.

## Voice and archive tables

### `writing_profiles`

Contains `id`, `user_id`, profile type/version, observations JSON, evidence summary JSON, analysis window dates, source count, status, and timestamps. Profiles are versioned so an AI run can identify which profile it used.

### `archive_documents`

Contains `id`, `user_id`, stable source key, title, URL, publication date, body text, optional source markup, tags JSON, source, destination, content hash, metadata JSON, and timestamps. Unique `(user_id, source, source_key)` supports idempotent import.

### `archive_chunks`

Contains `id`, `archive_document_id`, ordinal, body text, token count, embedding vector, embedding model, content hash, metadata JSON, and timestamps. Unique `(archive_document_id, ordinal)`. Create a pgvector index only after testing the dataset and selected distance metric; premature index tuning adds risk without benefit.

Postgres search adds a generated or maintained `tsvector` column on archive documents/chunks with a GIN index. Semantic and literal results retain document and chunk identifiers for citations in the UI.

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
