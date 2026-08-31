import "server-only";

import { getServerSession } from "next-auth";

import { readAuthEnvironment } from "@/lib/env/server";

import { createAuthOptions } from "./config";
import { isAllowedGitHubLogin } from "./policy";

export async function getAllowedSession() {
  const environment = readAuthEnvironment();
  if (!environment) {
    return null;
  }

  const session = await getServerSession(createAuthOptions(environment));
  if (
    !session?.user?.githubLogin ||
    !isAllowedGitHubLogin(
      session.user.githubLogin,
      environment.ALLOWED_GITHUB_LOGIN,
    )
  ) {
    return null;
  }

  return session;
}
