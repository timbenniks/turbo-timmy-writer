# GitHub OAuth setup

Turbo Timmy Writer uses stable NextAuth.js 4 with GitHub OAuth and JWT sessions. Database users are synchronized from GitHub's stable account ID on successful sign-in. A server-side allowlist admits only `ALLOWED_GITHUB_LOGIN`.

## Why two OAuth applications

GitHub OAuth applications accept one callback URL. Local development and production use different origins, so create separate applications and credentials. This avoids changing the callback URL each time the environment changes.

## Development application

Open GitHub **Settings → Developer settings → OAuth Apps → New OAuth App** and enter:

```text
Application name: Turbo Timmy Writer (Development)
Homepage URL: http://localhost:3001
Authorization callback URL: http://localhost:3001/api/auth/callback/github
```

Generate a client secret. Store the client ID and secret in Vercel's Development environment as `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`, then pull them into the ignored local file:

```bash
vercel env add AUTH_GITHUB_ID development --sensitive
vercel env add AUTH_GITHUB_SECRET development --sensitive
vercel env pull .env.local --environment development --yes
```

Do not paste either value into a committed file, issue, terminal transcript, or chat message.

## Production application

Create a second OAuth application:

```text
Application name: Turbo Timmy Writer
Homepage URL: https://turbo-timmy-writer.vercel.app
Authorization callback URL: https://turbo-timmy-writer.vercel.app/api/auth/callback/github
```

Store its credentials in Production:

```bash
vercel env add AUTH_GITHUB_ID production --sensitive
vercel env add AUTH_GITHUB_SECRET production --sensitive
```

Preview deployments are fail-closed until a deliberate preview OAuth strategy is chosen. Do not reuse the production credentials with a mismatched preview callback URL.

## Already configured

The following values are already configured in the appropriate Vercel environments:

- Dedicated `AUTH_SECRET` values for Development, Preview, and Production
- `ALLOWED_GITHUB_LOGIN=timbenniks`
- Development `NEXTAUTH_URL=http://localhost:3001`
- Production `NEXTAUTH_URL=https://turbo-timmy-writer.vercel.app`
- Neon database credentials managed by the Vercel integration

## Validation

After adding development credentials:

1. Run `pnpm dev`; the project is pinned to port 3001 because the local Hermes WhatsApp bridge uses port 3000.
2. Open `http://localhost:3001/sign-in`.
3. Sign in as `timbenniks` and verify the writing shell opens.
4. Sign out and verify the protected root redirects to sign-in.
5. Confirm `users` contains the GitHub account with its stable account ID.
6. Verify a non-allowlisted profile is rejected. The policy has unit coverage; a real second-account check is preferred when practical.

Repeat the allowed-login and sign-out checks against production after deployment.
