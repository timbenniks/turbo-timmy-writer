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

The authenticated suite round-trips a 1,200-word document through autosave and reload, restores and reloads the original article in `finally`, then verifies theme/focus changes leave prose unchanged. `.auth/`, traces, screenshots, and reports are ignored. Never commit the storage state; it contains an authenticated session.
