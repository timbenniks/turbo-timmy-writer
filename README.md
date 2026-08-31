# Turbo Timmy Writer

Turbo Timmy Writer is Tim Benniks' personal AI-assisted writing studio. The project is being delivered in validated phases; the current status lives in [`PROJECT_STATE.md`](./PROJECT_STATE.md).

## Local development

Requirements: Node.js 22 or newer and pnpm 11.25.0.

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to an ignored local environment file when database and authentication work begins. Phase 0 quality checks run with:

```bash
pnpm check
```

Read `AGENTS.md`, `docs/product-spec.md`, and the active phase document before making changes.
