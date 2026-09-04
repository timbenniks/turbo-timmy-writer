# Writing-core browser coverage

`pnpm test:e2e` always runs the unauthenticated, fail-closed checks at desktop and phone widths. The authenticated writing tests are skipped unless both variables below are present.

Create a local, ignored browser session:

```bash
pnpm test:e2e:record-auth
```

Then run the full suite against a designated disposable article:

```bash
PLAYWRIGHT_STORAGE_STATE=.auth/user.json \
PLAYWRIGHT_ARTICLE_ID=<article-uuid> \
pnpm test:e2e
```

The authenticated suite requires a disposable, single-paragraph, tag-free article whose title starts with `Playwright fixture`. It round-trips a 1,200-word document through autosave and reload, restores and reloads the original fixture in `finally`, verifies theme/focus changes leave prose unchanged, and exercises the reusable taxonomy picker before clearing its assignment. Never point it at authored or imported content: browser text replacement does not preserve rich document structure. `.auth/`, traces, screenshots, and reports are ignored. Never commit the storage state; it contains an authenticated session.

## Guided flow with deterministic AI

The guided premise → interview → brief → draft suite never calls OpenAI. It builds a local production server with a deterministic provider, creates a short-lived signed test session from the ignored local auth/database configuration, and cleans up each exact fixture. It can run beside the normal port-3001 development server:

```bash
PLAYWRIGHT_GUIDED_AI_MOCK=1 \
PLAYWRIGHT_PORT=3002 \
pnpm test:e2e -- guided-flow.authenticated.spec.ts
```

Vercel ignores `AI_PROVIDER_MODE`; the deterministic provider is available only in local/test processes.

## Precision AI with deterministic AI

The same command also runs the disposable Phase 3 suite. It creates its own article, exercises transformation diffs, Reject, guarded Accept, Humanizer, explicit follow-up rewriting, Critic, run history, and stale suggestion handling, then deletes its exact suggestions, reviews, runs, and article:

```bash
PLAYWRIGHT_GUIDED_AI_MOCK=1 \
PLAYWRIGHT_PORT=3002 \
pnpm exec playwright test tests/e2e/precision-ai.authenticated.spec.ts
```
