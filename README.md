# Turbo Timmy Writer

Turbo Timmy Writer is Tim Benniks' personal AI-assisted writing studio. The project is being delivered in validated phases; the current status lives in [`PROJECT_STATE.md`](./PROJECT_STATE.md).

For the complete operator setup—including GitHub OAuth, Neon, OpenAI, website
publishing, migrations, and troubleshooting—see
[`GETTING_STARTED.md`](./GETTING_STARTED.md).

## Local development

Requirements: Node.js 22 or newer and pnpm 11.25.0.

```bash
pnpm install
pnpm dev
```

Pull the managed Development environment or copy `.env.example` to an ignored
`.env.local` file. The full quality gate runs with:

```bash
pnpm check
```

Read `AGENTS.md`, `docs/product-spec.md`, and the active phase document before making changes.
