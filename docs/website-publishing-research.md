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
