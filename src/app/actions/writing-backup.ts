"use server";

import { z } from "zod";

import { getAllowedSession } from "@/auth/session";
import { getPortableWritingBackupForUser } from "@/db/queries/export";
import { readGitHubBackupEnvironment } from "@/lib/env/server";
import {
  createGitHubPublisher,
  GitHubPublisherError,
} from "@/publishing/adapters/github";

const deliveryInputSchema = z.object({ confirmed: z.literal(true) });

export async function deliverWritingBackupToGitHubAction(input: unknown) {
  const parsed = deliveryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: "Confirm the private backup delivery first." };
  }
  const session = await getAllowedSession();
  if (!session) return { ok: false as const, message: "Your session has expired." };
  const environment = readGitHubBackupEnvironment();
  if (!environment) {
    return { ok: false as const, message: "GitHub backup delivery is not configured." };
  }

  try {
    const exportedAt = new Date();
    const backup = await getPortableWritingBackupForUser(session.user.id, exportedAt);
    const content = `${JSON.stringify(backup, null, 2)}\n`;
    const publisher = createGitHubPublisher({
      token: environment.token,
      allowedRepositories: [environment.repository],
    });
    const target = {
      repository: environment.repository,
      path: environment.path,
      branch: environment.branch,
    };
    const current = await publisher.inspectFile(target);
    const result = await publisher.writeFile({
      ...target,
      content,
      expectedSha: current?.sha,
      message: `Back up Turbo Timmy Writer ${exportedAt.toISOString()}`,
    });
    return {
      ok: true as const,
      message: "Private writing backup committed to GitHub.",
      url: result.commit.html_url,
    };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof GitHubPublisherError
        ? error.message
        : "The writing backup could not be delivered.",
    };
  }
}
