# Website Publishing Research

Verified on 2026-09-04 through read-only GitHub CLI/API calls, an HTTPS clone in
`/tmp`, and GET requests to `https://timbenniks.dev`. No article, deployment, or
external configuration was created or changed.

## Repository

- The live website source is `timbenniks/timbenniksdev-2024`, not
  `timbenniks/timbenniks.dev`.
- The repository is public and uses `main` as its default branch.
- The current inspected head was `65b88a9c5bf255d3cccb2d0d53bfdbeba06613ae`,
  pushed at `2026-09-04T10:38:59Z`.
- Writing content lives in `content/4.writing`.
- A website article path is `content/4.writing/<slug>.md`.

## Runtime and Deployment

- The site is a Nuxt 3 application using `@nuxt/content`.
- `package.json` defines `build` as `nuxt build`.
- There is no `.github/workflows` directory and the GitHub Actions API returned
  no recent workflow runs for the repository.
- GitHub deployments show Vercel as the deployment status provider. The current
  `main` commit has a successful `Vercel` status pointing at a Vercel deployment.
- `nuxt.config.ts` prerenders `/`, `/sitemap.xml`, and `/feed.xml`.
- Publication code in Turbo Timmy Writer should create/update GitHub content only;
  the existing Vercel GitHub integration handles deployments.

## Writing Schema

Across the current non-index files in `content/4.writing`:

- 83 Markdown files exist.
- Every file has `title`, `slug`, `description`, `date`, `image`, `tags`, and
  `reading_time`.
- 76 files have `canonical_url`; three of those are blank strings and seven omit
  the field.
- 74 files have `head.meta` with `twitter:image`, `twitter:title`,
  `twitter:description`, and `keywords`.
- 55 files have `faqs`.
- 49 files have a legacy `id`; 38 files have `collection_id`.
- 71 files specify `draft`; three are `draft: true`.
- The current live site returns `404` for a `draft: true` writing route, while a
  `draft: false` route returns `200`.

## Consumer Behaviour

- `pages/writing/[...slug].vue` reads a post by `_path: route.path`.
- Article pages consume `title`, `date`, `tags`, `image`, `reading_time`,
  `description`, `canonical_url`, and optional `faqs`.
- JSON-LD builds `timeRequired` from
  `reading_time.split(" min read")[0]`, so new output should use integer
  `"<minutes> min read"` values.
- The article template sets a canonical link only when `canonical_url` is
  truthy.
- Feed and sitemap routes query `/writing` from Nuxt Content. The live feed
  includes the writing index page as an item, so Turbo Timmy Writer should not
  infer publication filtering from feed shape alone.

## Phase 6 Local Decisions

- New timbenniks.dev publication output derives canonical URLs as
  `https://timbenniks.dev/writing/<slug>`.
- New publication output uses
  `content/4.writing/<slug>.md` as the repository path.
- New publication output always emits `draft: false` after explicit publication
  confirmation.
- New publication output emits the current duplicated `head.meta` shape for
  Twitter and keyword metadata.
- Legacy `id` and `collection_id` are not required for new timbenniks.dev output.

## Local dual-repository verification

The local `/home/timbenniks/Projects/timbenniksdev-2024` and
`/home/timbenniks/Projects/timbenniks-2026` worktrees were inspected read-only
on 2026-09-04. Existing uncommitted work in the 2024 repository was left
untouched.

The repositories consume the same final article body through different source
paths and frontmatter contracts:

| Target | Publishable path | Target-specific output |
| --- | --- | --- |
| `timbenniksdev-2024` | `content/4.writing/<slug>.md` | Nuxt Content frontmatter keeps `slug` and duplicated `head.meta` values. `id` and `collection_id` remain legacy optional fields and are omitted for new articles. |
| `timbenniks-2026` | `src/content/writing/<slug>.md` | Astro derives the slug from the filename and derives page SEO, Twitter metadata, JSON-LD, feeds, search data, and the public Markdown twin. New source output therefore omits legacy `slug`, `head`, `id`, and `collection_id` fields. |

The 2026 writing schema consumes `title`, `description`, `date`, `image`,
`tags`, `canonical_url`, `reading_time`, optional `faqs`, and `draft`. Its
canonical taxonomy contains 17 lowercase kebab-case tags; its normalization
policy deduplicates, prioritizes, and caps articles at five tags. Turbo Timmy
Writer validates against that common taxonomy so one metadata selection is safe
for both repositories.

The 2024 repository's untracked `writing/drafts` workspace is an editorial
record containing a brief, evidence ledger, facts to verify, working draft, and
handoff checklist. It must not be written into the site's recursively processed
`content/4.writing` directory. Turbo Timmy Writer already stores the canonical
article, revisioned brief, interview, and versions; exporting this redundant
editorial record is not required for website publication.

Both repositories rely on their GitHub-to-Vercel integration after a commit.
The publisher must preview both files together, ask for explicit confirmation,
write and record each repository result independently, and surface partial
success rather than claiming the two-repository operation was atomic.
