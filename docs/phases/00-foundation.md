# Phase 0: foundation

## Goal

Establish a documented, secure, testable application foundation that runs locally and on Vercel. Do not add AI functionality.

## Entry conditions

- Read `docs/product-spec.md`, `docs/architecture.md`, `docs/data-model.md`, and `PROJECT_STATE.md`.
- Inspect Git status and preserve unrelated work.
- Confirm GitHub, Vercel, and Neon access before external provisioning.

## Implementation plan

### Slice A: documentation and decisions

- Audit the writing-voice seed repository.
- Create the required durable documentation.
- Record environment and authentication issues.
- Validate architecture before scaffolding.

Checkpoint: the docs let a fresh Codex session explain the system boundaries, phase order, schema plan, and next task.

### Slice B: local application foundation

- Install/activate pnpm and pin it through `packageManager`.
- Scaffold Next.js App Router with TypeScript, Tailwind, ESLint, and `src/` layout.
- Add shadcn/ui primitives needed by the shell.
- Build an authenticated-looking but data-free writing shell with Library, Drafts, Ideas, Published, Archive, Search, and Settings navigation.
- Add Vitest, a smoke unit test, environment validation, formatting/lint/typecheck scripts, and a production build.

Checkpoint: local development starts; lint, typecheck, tests, and build pass; the UI is manually inspected at desktop and narrow widths.

Validation recorded 2026-08-31:

- Next.js 16.3.3, React 19.2.8, Tailwind 4.3.3, pnpm 11.25.0, shadcn-compatible primitives, and Vitest 4.1.11 are installed and locked.
- `pnpm check` passes lint, standalone typecheck, unit tests, and production build.
- The writing shell was rendered and visually inspected at 1440 × 1000 and 390 × 844. The editor remains dominant, navigation/assistant collapse at narrow width, and browser logs contain no application errors.
- ESLint 10 was evaluated but is not yet compatible with the React plugin shipped through `eslint-config-next` 16.3.3. The official scaffold's ESLint 9 line remains pinned until that dependency chain supports ESLint 10.

### Slice C: database and authentication

- Provision or connect Neon.
- Add Drizzle configuration, the minimal Phase 0 schema, and committed migrations.
- Integrate GitHub OAuth and persist/synchronize the allowed user as needed.
- Enforce `ALLOWED_GITHUB_LOGIN` during sign-in and on protected routes/mutations.
- Add an unauthorized page and safe sign-out.
- Document environment variables without committing secrets.

Checkpoint: migrations apply to an empty database; the allowed GitHub account can enter; a different login is denied; secrets remain server-side.

Progress recorded 2026-08-31:

- Created the Vercel project and a dedicated free Neon resource in Frankfurt, connected across Development, Preview, and Production.
- Generated, checked, and applied the initial Drizzle migration; queried Neon to confirm the `users` table.
- Implemented stable NextAuth.js 4 GitHub OAuth, JWT sessions, profile validation, user synchronization, allowlist checks at sign-in and protected routes, and sign-in/out UI.
- Added distinct environment secrets and verified missing OAuth credentials fail closed with a protected-root redirect, setup UI, and 503 auth endpoint.
- Local and production OAuth application creation remains a manual GitHub settings task. Instructions live in `docs/auth-setup.md`.
- Development OAuth completed successfully after reserving port 3001 for this app. The OAuth flow synchronized the allowlisted `timbenniks` identity into Neon, and runtime verification used the pooled application URL while migrations continue to use the direct URL.

### Slice D: repository and CI

- Initialize Git with `main` as the default branch.
- Create the GitHub repository after confirming visibility if it cannot be inferred safely.
- Use HTTPS for the initial remote unless SSH credentials are repaired.
- Add GitHub Actions for install, lint, typecheck, unit tests, and production build.
- Commit coherent foundation milestones.

Checkpoint: the remote repository contains clean commits and CI passes.

### Slice E: Vercel deployment

- Repair Vercel CLI authentication.
- Link/create the Vercel project.
- Configure preview and production environment variables.
- Deploy and inspect logs/output.
- Validate OAuth callback URLs, login allowlist, database connectivity, and application shell in production.

Checkpoint: all Phase 0 acceptance criteria pass in the deployed environment.

## Acceptance criteria

- The app runs locally.
- The app deploys on Vercel.
- GitHub login works.
- Unauthorized accounts cannot enter.
- Database migrations apply successfully.
- CI runs lint, typecheck, tests, and production build successfully.
- `PROJECT_STATE.md` accurately records the completed work, decisions, known issues, and next task.

## Validation commands

Use the scripts defined by the scaffold, expected to include:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm drizzle-kit migrate
```

Do not mark this phase complete based only on local mocks. OAuth, migrations, CI, and the Vercel deployment require real validation.

## Out of scope

Tiptap, article editing, AI dependencies, OpenAI credentials, archive import, variants, and publishing are later phases.
