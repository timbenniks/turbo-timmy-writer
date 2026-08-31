import "server-only";

import { getDatabase } from "@/db/client";
import { users } from "@/db/schema";

export type UpsertGitHubUserInput = {
  githubAccountId: string;
  githubLogin: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export async function upsertGitHubUser(input: UpsertGitHubUserInput) {
  const [user] = await getDatabase()
    .insert(users)
    .values(input)
    .onConflictDoUpdate({
      target: users.githubAccountId,
      set: {
        githubLogin: input.githubLogin,
        name: input.name,
        email: input.email,
        avatarUrl: input.avatarUrl,
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id });

  if (!user) {
    throw new Error("GitHub user upsert did not return a user ID.");
  }

  return user;
}
