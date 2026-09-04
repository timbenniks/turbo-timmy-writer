# Repository instructions

## Start every task

1. Read `docs/product-spec.md`.
2. Read `PROJECT_STATE.md`.
3. Read the active `docs/phases/*.md` file.
4. Inspect `git status` before modifying files.
5. Preserve unrelated user work.

## Phase discipline

- Work only in the current phase unless an earlier acceptance criterion requires a narrowly scoped prerequisite.
- Implement the smallest coherent slice and validate it before expanding.
- Do not mark a phase complete while any acceptance criterion fails.
- Update the active phase plan, architecture/data-model docs when decisions change, and `PROJECT_STATE.md` after each coherent slice.
- Commit coherent milestones only after relevant tests, typecheck, and build pass.

## Product invariants

- Tim remains the author. AI never silently edits existing prose.
- Tiptap JSON is the canonical article representation. Plain text and Markdown are projections.
- Archive retrieval and voice guidance are separate concerns.
- Variants never overwrite the canonical article and regeneration never silently destroys manual edits.
- Publication requires validation, preview, and explicit confirmation.
- Secrets and privileged integrations stay server-side.
- Existing writing-voice material is curated seed evidence, not a runtime dependency or rigid template.

## Engineering conventions

- Use pnpm and keep the lockfile committed.
- Use Next.js server components by default; add client components only for browser interaction.
- Validate external input and environment configuration with Zod.
- Avoid `any` and broad miscellaneous utility modules.
- Keep strong boundaries around editor serialization, AI skills, voice, retrieval, database access, and publishers.
- Use deterministic code and focused tests for slugging, reading time, serialization, validation, state transitions, and stale calculations.
- CI and tests must not call paid OpenAI APIs.

## Verification

Run the relevant subset during a slice and the full Phase 0 baseline before committing:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run database migrations against an empty/test database when schema changes. Manually inspect affected UI in a browser where possible. Record exact evidence and unresolved issues in `PROJECT_STATE.md`.

## Git and external services

- Inspect status before edits and never destroy unrelated changes.
- Use `gh` for repository operations and inspection; deployed code uses the GitHub API.
- Use `vercel` for linking, environment configuration, deployment, and inspection; deployed code does not invoke it.
- Never commit `.env` files, API keys, OAuth secrets, tokens, or database credentials.
- Ask before choices with durable external impact that cannot be safely inferred, such as repository visibility or destructive publication.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
