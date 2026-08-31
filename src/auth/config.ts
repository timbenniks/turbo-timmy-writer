import "server-only";

import type { NextAuthOptions } from "next-auth";
import GitHubProvider, {
  type GithubProfile,
} from "next-auth/providers/github";
import { z } from "zod";

import { upsertGitHubUser } from "@/db/queries/users";
import type { AuthEnvironment } from "@/lib/env/server";

import { isAllowedGitHubLogin, normalizeGitHubLogin } from "./policy";

const githubProfileSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  login: z.string().min(1),
  name: z.string().nullable().optional(),
  email: z.email().nullable().optional(),
  avatar_url: z.url().nullable().optional(),
});

function parseGitHubProfile(profile: unknown) {
  const result = githubProfileSchema.safeParse(profile);
  return result.success ? result.data : null;
}

export function createAuthOptions(
  environment: AuthEnvironment,
): NextAuthOptions {
  return {
    secret: environment.AUTH_SECRET,
    session: {
      strategy: "jwt",
    },
    pages: {
      signIn: "/sign-in",
      error: "/sign-in",
    },
    providers: [
      GitHubProvider<GithubProfile>({
        clientId: environment.AUTH_GITHUB_ID,
        clientSecret: environment.AUTH_GITHUB_SECRET,
      }),
    ],
    callbacks: {
      signIn({ profile }) {
        const githubProfile = parseGitHubProfile(profile);

        return Boolean(
          githubProfile &&
            isAllowedGitHubLogin(
              githubProfile.login,
              environment.ALLOWED_GITHUB_LOGIN,
            ),
        );
      },
      async jwt({ token, profile }) {
        if (!profile) {
          return token;
        }

        const githubProfile = parseGitHubProfile(profile);
        if (!githubProfile) {
          throw new Error("GitHub returned an invalid profile.");
        }

        const githubLogin = normalizeGitHubLogin(githubProfile.login);
        if (
          !isAllowedGitHubLogin(
            githubLogin,
            environment.ALLOWED_GITHUB_LOGIN,
          )
        ) {
          throw new Error("GitHub login is not allowed.");
        }

        const user = await upsertGitHubUser({
          githubAccountId: githubProfile.id,
          githubLogin,
          name: githubProfile.name ?? null,
          email: githubProfile.email ?? null,
          avatarUrl: githubProfile.avatar_url ?? null,
        });

        token.userId = user.id;
        token.githubAccountId = githubProfile.id;
        token.githubLogin = githubLogin;

        return token;
      },
      session({ session, token }) {
        if (
          session.user &&
          typeof token.userId === "string" &&
          typeof token.githubAccountId === "string" &&
          typeof token.githubLogin === "string"
        ) {
          session.user.id = token.userId;
          session.user.githubAccountId = token.githubAccountId;
          session.user.githubLogin = token.githubLogin;
        }

        return session;
      },
    },
  };
}
