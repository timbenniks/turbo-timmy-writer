# Getting started

This is the operator guide for Turbo Timmy Writer. Use it when setting up a new
machine, rotating credentials, or enabling a feature that is intentionally not
configured yet.

## What already works

The application is deployed at <https://turbo-timmy-writer.vercel.app>.
Production GitHub OAuth, Neon Postgres, generative OpenAI calls, and archive
embeddings are configured. Database migrations `0000` through `0015` are
applied.

The remaining optional production setup is the GitHub publishing token. Until
that token is added, articles and variants remain safe in Turbo Timmy Writer and
the app cannot write to either website repository.

## Use the deployed app

1. Open <https://turbo-timmy-writer.vercel.app>.
2. Sign in with the allowlisted `timbenniks` GitHub account.
3. Create or reopen an article.
4. Edit the canonical article, then create destination variants when ready.
5. For a website variant, save it and inspect both exact Markdown previews
   before confirming either repository independently.

Publishing always requires an explicit confirmation. A variant never
overwrites the canonical article.

## Set up a development machine

Requirements:

- Node.js 22 or newer
- pnpm 11.25.0
- Git
- Vercel CLI when pulling the managed development environment

Clone and install:

```bash
git clone https://github.com/timbenniks/turbo-timmy-writer.git
cd turbo-timmy-writer
corepack enable
pnpm install --frozen-lockfile
```

Link the existing Vercel project and pull its Development values into the
ignored `.env.local` file:

```bash
vercel link
vercel env pull .env.local --environment development --yes
```

If `.env.local` already exists, back it up before pulling because it contains
local secrets. Never commit it.

Start the application on its intentional local port:

```bash
pnpm dev
```

Then open <http://localhost:3001>. Port 3001 is used because port 3000 belongs
to the local Hermes WhatsApp bridge.

## Environment checklist

`.env.example` is the source of truth for variable names. Secrets belong only
in `.env.local` or Vercel's encrypted environment storage.

| Variable | Needed for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Application database access | Use the pooled Neon URL. |
| `DATABASE_URL_UNPOOLED` | Migrations and write-heavy maintenance scripts | Use the direct Neon URL. |
| `AUTH_SECRET` | Signed login sessions | Use a long, random, environment-specific value. |
| `AUTH_GITHUB_ID` | GitHub sign-in | Use the client ID for the environment's OAuth App. |
| `AUTH_GITHUB_SECRET` | GitHub sign-in | Secret; local and Production use different OAuth Apps. |
| `ALLOWED_GITHUB_LOGIN` | Access control and data ownership | Currently `timbenniks`. |
| `NEXTAUTH_URL` | OAuth callback origin | Local is `http://localhost:3001`; Production is the canonical Vercel URL. |
| `OPENAI_API_KEY` | Live interview, drafting, editing, reviews, repurposing, and embeddings | Secret and server-side only. |
| `OPENAI_MODEL` | Default generative model | Used for every generative purpose unless overridden. |
| `OPENAI_MODEL_INTERVIEW` | Optional model override | Leave unset to use `OPENAI_MODEL`. |
| `OPENAI_MODEL_DRAFT` | Optional model override | Leave unset to use `OPENAI_MODEL`. |
| `OPENAI_MODEL_EDIT` | Optional model override | Leave unset to use `OPENAI_MODEL`. |
| `OPENAI_MODEL_REVIEW` | Optional model override | Leave unset to use `OPENAI_MODEL`. |
| `OPENAI_MODEL_REPURPOSE` | Optional model override | Leave unset to use `OPENAI_MODEL`. |
| `OPENAI_MODEL_EMBEDDING` | Archive semantic search | Must be a `text-embedding-3-*` model; vectors use 1,024 dimensions. |
| `GITHUB_PUBLISH_TOKEN` | Live website publishing | Optional fine-grained token described below. |
| `GITHUB_PUBLISH_BRANCH` | Website target branch | Defaults to `main`. |
| `GITHUB_BACKUP_REPOSITORY` | Optional portable-backup delivery | Private `owner/repository` target; requires the publish token to have Contents access there. |
| `GITHUB_BACKUP_PATH` | Optional portable-backup delivery | Exact repository-relative JSON path, for example `backups/turbo-timmy-writer.json`. |
| `GITHUB_BACKUP_BRANCH` | Optional portable-backup delivery | Defaults to `main`. |
| `CLOUDINARY_CLOUD_NAME` | Optional managed hero-image uploads | Product-environment cloud name; all three Cloudinary values are required together. |
| `CLOUDINARY_API_KEY` | Optional managed hero-image uploads | Server-side credential from Cloudinary API Keys settings. |
| `CLOUDINARY_API_SECRET` | Optional managed hero-image uploads | Secret; never expose it to the browser. |
| `BUTTONDOWN_API_KEY` | Optional newsletter draft delivery | Secret; enables draft creation only after orchestration is explicitly configured. |
| `CONTENTSTACK_API_HOST` | Optional Contentstack draft delivery | Regional CMA HTTPS host; defaults to `https://api.contentstack.io`. |
| `CONTENTSTACK_API_KEY` | Optional Contentstack draft delivery | Stack API key; server-side only. |
| `CONTENTSTACK_MANAGEMENT_TOKEN` | Optional Contentstack draft delivery | Least-privilege Management Token; secret and server-side only. |
| `CONTENTSTACK_CONTENT_TYPE_UID` | Optional Contentstack draft delivery | Developers article content-type UID. |
| `CONTENTSTACK_LOCALE` | Optional Contentstack draft delivery | Defaults to `en-us`. |
| `CONTENTSTACK_BRANCH` | Optional Contentstack draft delivery | Defaults to `main`. |
| `LINKEDIN_ACCESS_TOKEN` | Optional direct LinkedIn publishing | OAuth token with `w_member_social`; server-side only. |
| `LINKEDIN_AUTHOR_URN` | Optional direct LinkedIn publishing | Tim's numeric `urn:li:person:…` author identity. |
| `LINKEDIN_API_VERSION` | Optional direct LinkedIn publishing | Supported API version in `YYYYMM` form; configure deliberately. |

## GitHub OAuth

Local and Production require separate GitHub OAuth Apps because an OAuth App
accepts one callback URL. The exact application names, callback URLs, Vercel
commands, and validation steps are in [docs/auth-setup.md](docs/auth-setup.md).

Preview deployments deliberately have no GitHub OAuth credentials. They fail
closed until a preview-login strategy is intentionally chosen.

## Neon and database migrations

The existing Neon database is connected through Vercel. Normal application
traffic uses `DATABASE_URL`; migrations use `DATABASE_URL_UNPOOLED` when it is
available.

Check schema consistency and prove the complete migration chain against an
empty local test database:

```bash
pnpm db:check
pnpm db:test-migrations
```

Apply pending migrations only after reviewing the generated SQL and confirming
the target database:

```bash
pnpm db:migrate
```

Do not run a migration or an import merely to test connectivity. Establish a
disposable Neon branch before the first destructive or data-transforming
migration.

## OpenAI

Set `OPENAI_API_KEY` and one shared `OPENAI_MODEL` to enable the writing tools.
Only add purpose-specific model variables when a workflow genuinely needs a
different model. Configure `OPENAI_MODEL_EMBEDDING` separately because it must
be embedding-capable.

The application keeps provider credentials server-side and disables provider
response storage. CI supplies no OpenAI key and never performs paid calls.

## Enable managed hero-image uploads later

Hero images work without an upload provider: paste an existing HTTP(S) image
URL, add alternative text, and save. To upload a new image through Cloudinary,
create or select a Cloudinary product environment and copy its cloud name, API
key, and API secret from its API Keys settings. Add all three values to the
same local or Vercel environment and restart or redeploy:

```bash
vercel env add CLOUDINARY_CLOUD_NAME production
vercel env add CLOUDINARY_API_KEY production --sensitive
vercel env add CLOUDINARY_API_SECRET production --sensitive
```

The API secret remains server-side. Turbo Timmy Writer accepts JPEG, PNG,
WebP, AVIF, and GIF files up to 10 MB, uploads only after Tim selects a file,
and still requires alternative text plus an explicit article save. Uploaded
assets use the `turbo-timmy-writer/heroes` folder. Cloudinary storage and
delivery can incur provider charges, so leave these values unset until managed
uploads are wanted.

## Enable newsletter draft delivery later

`BUTTONDOWN_API_KEY` is reserved for the optional Buttondown adapter. The
current adapter is draft-only and is not yet connected to the publication UI,
so leave the value unset until delivery orchestration and its audit record are
enabled. When that slice is complete, use a dedicated Buttondown API key in the
Vercel Production environment; never expose it to the browser or reuse a
broader personal credential. Creating a draft may count toward provider usage,
but Turbo Timmy Writer will not send or publish a newsletter automatically.

## Enable Contentstack Developers drafts later

The Contentstack adapter can create an unpublished entry through the Content
Management API, but it is not connected to the UI until the actual Developers
content-type field contract and durable delivery audit are configured. Leave
the six `CONTENTSTACK_*` values unset for now. Later, use the regional CMA host,
stack API key, Developers content-type UID, locale, branch, and a dedicated
least-privilege Management Token. These values remain server-side. Entry
creation may affect plan usage; publishing remains a separate explicit action.

## Enable direct LinkedIn publishing later

Direct member posting is technically supported through LinkedIn's versioned
Posts API when an app has the self-serve **Share on LinkedIn** product and an
OAuth token with `w_member_social`. It also requires Tim's numeric Person URN
and a currently supported `YYYYMM` API version. The API publishes immediately,
so leave all three `LINKEDIN_*` values unset until explicit-confirmation UI and
durable delivery auditing are enabled. Tokens expire and must stay server-side;
never reuse the GitHub OAuth credential or place a LinkedIn token in the client.

## Enable website publishing later

Create a fine-grained GitHub personal access token owned by `timbenniks` with:

- access limited to `timbenniks/timbenniksdev-2024` and
  `timbenniks/timbenniks-2026`;
- repository **Contents: Read and write** permission;
- no additional repository or account permissions; and
- a practical expiration date so the credential is rotated deliberately.

Add it only to the Vercel Production environment:

```bash
vercel env add GITHUB_PUBLISH_TOKEN production --sensitive
vercel env add GITHUB_PUBLISH_BRANCH production
```

Enter `main` for `GITHUB_PUBLISH_BRANCH`, then redeploy the application so the
new environment values are present in the runtime. Do not copy the broader
GitHub CLI credential into Vercel or `.env.local`.

Before the first real publication:

1. Save the website variant and make sure it is current and marked ready.
2. Inspect the complete Nuxt 2024 and Astro 2026 Markdown previews.
3. Confirm one target at a time.
4. Check the recorded commit SHA and canonical URL in Turbo Timmy Writer.
5. Confirm the corresponding website deployment succeeds before confirming the
   second target.

The application writes through the GitHub Contents API. It does not shell out
to `gh`, invoke Vercel, or modify a local website checkout.

## Enable private GitHub backups later

Create or select a private repository and give the fine-grained
`GITHUB_PUBLISH_TOKEN` Contents read/write access to that repository. Then add
the exact target configuration and redeploy:

```bash
vercel env add GITHUB_BACKUP_REPOSITORY production
vercel env add GITHUB_BACKUP_PATH production
vercel env add GITHUB_BACKUP_BRANCH production
```

The Insights button stays disabled until all values and the token are valid.
Each click shows the configured target and requires confirmation, then replaces
that one file using its current blob SHA and links to the resulting commit.
Use a private repository: the JSON includes canonical writing, immutable
versions, variants, and publication history, and GitHub retains prior commits.
Payloads above 10 MB are rejected. Direct browser download remains available
without this setup.

## Validate before pushing

Run the full baseline:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For browser boundary checks:

```bash
pnpm test:e2e
```

Authenticated end-to-end tests require a deliberately recorded local auth
state; see [tests/e2e/README.md](tests/e2e/README.md). Never commit that state.

## Archive maintenance

Archive scripts are intentionally dry-run-first. The source is the 2024 site's
`content/4.writing` directory.

```bash
pnpm db:import-archive --source=/absolute/path/to/content/4.writing
pnpm db:sync-archive-memory
```

Only add `--write` after inspecting the dry-run summary. Add `--embed` together
with `--write` only when OpenAI usage is intended:

```bash
pnpm db:import-archive --source=/absolute/path/to/content/4.writing --write
pnpm db:sync-archive-memory --write --embed
```

`db:import-writing` is a replacement import for canonical articles and is more
destructive. Do not pass its `--replace` option without first backing up the
database and confirming that replacing the owner's articles is intended.

## Common problems

- **The root redirects to sign-in:** expected when no authenticated session is
  present.
- **The sign-in page reports missing setup:** check the four auth variables and
  the exact OAuth callback URL.
- **AI actions are unavailable:** check `OPENAI_API_KEY`, `OPENAI_MODEL`, and the
  relevant optional purpose override.
- **Semantic search is unavailable:** check `OPENAI_MODEL_EMBEDDING` and confirm
  archive chunks have embeddings.
- **Publishing reports missing configuration:** add the scoped publisher token
  and branch to Production, then redeploy.
- **A Preview deployment cannot sign in:** expected with the current fail-closed
  Preview OAuth policy.
- **Local port 3001 is occupied:** stop the conflicting process or set an
  intentional alternate port and update the Development OAuth callback to
  match before signing in.

For current deployment state, completed migrations, and known limitations, see
[PROJECT_STATE.md](PROJECT_STATE.md).
