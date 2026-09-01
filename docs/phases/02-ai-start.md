# Phase 2: AI-assisted start

## Goal

Implement the premise-to-interview-to-brief-to-first-draft workflow.

## Planned slices

1. Add the versioned AI runtime, model configuration, run logging, and mocked provider boundary.
2. Add premise capture, immediate persistence, article-start sessions, and streamed message storage.
3. Implement the interview skill with one question at a time and dynamic completion.
4. Add structured, revisioned brief updates and a collapsible manual brief editor.
5. Implement explicit first-draft generation, stream it into the editor, and create `Initial AI draft`.
6. Keep conversation and brief accessible from the writing workspace; add integration and Playwright coverage.

## Slice 1 validation — 2026-09-01

- Added a provider-neutral, versioned skill contract with explicit input/output schemas, model purpose, instructions, prompt construction, and narrowly resolved context.
- Added one central model configuration boundary for interview, draft, edit, review, and embedding model environment variables. Live credentials remain optional until a live provider adapter is enabled.
- Added structured and streamed executors. Both validate before execution, record a running entry before the provider call, persist safe timing/usage/outcome metadata, and never retain prompt text, generated content, keys, or headers.
- Structured output is parsed again at the runtime boundary. Invalid output records `structured_output_parse_failure`; provider errors use bounded safe codes; aborts and abandoned stream consumers remain truthfully `cancelled`.
- Added a deterministic mock provider and focused tests for configuration, successful structured and streamed work, invalid structured output, provider failure, and early stream cancellation. No paid provider call is possible in the test path.
- Generated and applied additive migration `0005_far_loners.sql` through the direct database URL. Pooled inspection confirmed the 14-column `ai_runs` table, all four statuses, and zero synthetic rows.
- Passed Drizzle schema validation, ESLint, standalone TypeScript, 35 unit tests, the Next.js production build, and four credential-free desktop/mobile Playwright checks; six authenticated writing checks skipped intentionally without their local fixture.

Checkpoint approved: credential-free runtime commit `a7fbdd8` passed GitHub Actions run `33526595600` and Vercel deployment `dpl_ETgNE3MN7p91DzMpgwGAgf4TLxHm` reached Ready on the canonical Production alias. Slice 2 can add the first user-visible premise and persisted writing-session flow without changing provider semantics.

## Slices 2–3 validation — 2026-09-01

- Changed the default new-article path from an empty document to a protected premise screen, while retaining `Open a blank article` as an explicit secondary choice.
- Added owner-scoped article-start sessions and ordered versioned messages. The interviewing article, active session, and first premise message are persisted together before any provider request.
- Added a live server-only OpenAI Responses adapter through the Vercel AI SDK. It uses the user-configured model, `store: false`, bounded output, a 45-second timeout, and safe failure codes; credentials never enter client code or run records.
- `OPENAI_MODEL` is now the shared interview/draft/edit/review default. Purpose-specific variables remain optional overrides; embeddings remain separately configured.
- Added versioned interview skill `article-interview/v1`. It dynamically chooses the highest-value missing detail, asks exactly one concise question, has no fixed count or sequence, does not draft, and stops questioning when Tim asks to draft.
- The authenticated route stores answers before generation, streams NDJSON text deltas, and stores only a complete assistant turn linked to the successful AI run. Interrupted or failed work leaves Tim's input durable and retryable.
- Real authenticated browser validation created a disposable premise, streamed a first question, persisted an answer, streamed a specific follow-up, reloaded the workspace, and recovered all four ordered turns with zero browser errors. Database cleanup removed the two exact QA articles and four runs, returning to 82 articles and zero article-start sessions/messages.
- Migration `0006_long_grim_reaper.sql` passed Drizzle validation, applied successfully through the direct database URL, and pooled inspection confirmed both new tables.
- ESLint, standalone TypeScript, 41 unit tests, and the production build pass. Unit tests include shared model fallback, purpose overrides, interview prompt invariants, serialization, and incomplete-response detection without paid calls.

Slices 2 and 3 are locally complete. The next coherent slice is the structured, revisioned working brief and its manual editor.

Deployment checkpoint: commit `6341184` passed GitHub Actions run `33535177840` in 1m22s, including four credential-free browser tests and the production build. Vercel deployment `dpl_CgZSrGPpb6oE3soz2Pm26WTP47Y8` reached Ready and owns `https://turbo-timmy-writer.vercel.app`; Production has the OpenAI key as a Secret and the shared model as Config.

## Slice 4 validation — 2026-09-01

- Added the strict complete `ArticleBrief` boundary. Optional thesis/takeaway values use explicit nulls, arrays use bounded evidence items, and premise-only revision 1 exists before the first provider call.
- Added immutable `article_briefs` revisions in migration `0007_exotic_enchantress.sql`, with per-article monotonic uniqueness, source (`system`, `ai`, or `user`), and optional generating run.
- Added evidence-only structured skill `article-brief-update/v1`. It returns the whole brief, preserves Tim's premise and uncertainty, treats only Tim's words as evidence, and leaves unknown fields empty rather than inventing content.
- After an answer, the route stores the streamed question first and then attempts the brief update. Structured failure cannot erase the conversation; success streams the new revision into the workspace.
- Added Conversation/Brief tabs and a complete manual brief editor. Each field is visible and editable; lists use one item per line; Save appends a user revision with conflict detection.
- The first provider check revealed OpenAI strict JSON Schema requires every property in `required`. Replacing omitted optional strings with required nullable strings fixed the schema while retaining optional semantics; a focused live structured-output probe passes.
- Authenticated browser QA created revision 1 from the premise, revision 2 from a specific answer with its AI run attached, and revision 3 from a manual thesis edit without an AI run. A fresh tab restored revision 3 exactly with zero new browser errors.
- Cleanup removed the exact disposable article and its three runs. Pooled counts returned to 82 articles and zero sessions, messages, or briefs.
- Drizzle schema validation, ESLint, standalone TypeScript, and 44 unit tests pass. Migration `0007_exotic_enchantress.sql` applied successfully and pooled inspection confirmed its seven columns.

Slice 4 is locally complete. The next coherent slice is explicit complete-draft generation from the current brief and conversation, followed by an immutable `Initial AI draft` checkpoint.

## Key decisions to validate

- Tim can stop the interview at any time.
- Structured brief parsing recovers safely from invalid provider output.
- Stream interruption retains a truthful AI run and does not corrupt the article.
- A generated first draft is distinguishable from later edits and has a stable snapshot.

## Acceptance criteria

- A premise alone starts a useful conversation.
- The agent asks one useful question at a time and never requires a fixed count.
- Tim can end the interview whenever desired.
- The visible brief evolves and remains manually editable.
- The draft incorporates interview-specific evidence and intent.
- Conversation history remains available after drafting.

This is the first major product milestone.
