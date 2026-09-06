import "server-only";

import { z } from "zod";
import { linkedInTextPostSnapshot } from "@/delivery/linkedin";

const postIdSchema = z.string().trim().regex(/^urn:li:(?:share|ugcPost):[0-9]+$/).max(200);

export class LinkedInPublishError extends Error {
  constructor(readonly code: "invalid_request" | "authentication" | "permission" | "rate_limit" | "timeout" | "unavailable" | "invalid_response") {
    const messages = {
      invalid_request: "The LinkedIn post is invalid.",
      authentication: "LinkedIn rejected the configured access token.",
      permission: "LinkedIn did not grant permission to publish this post.",
      rate_limit: "LinkedIn's request limit has been reached.",
      timeout: "LinkedIn did not respond in time.",
      unavailable: "LinkedIn could not publish the post.",
      invalid_response: "LinkedIn returned an invalid post identity.",
    } as const;
    super(messages[code]);
    this.name = "LinkedInPublishError";
  }
}

export function createLinkedInPublisher(options: {
  accessToken: string;
  authorUrn: string;
  apiVersion: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}) {
  const config = z.object({
    accessToken: z.string().trim().min(1).max(2_000),
    authorUrn: z.string().trim().regex(/^urn:li:person:[0-9]+$/).max(200),
    apiVersion: z.string().regex(/^20[0-9]{4}$/),
  }).parse(options);
  const request = options.fetch ?? fetch;
  const timeoutMs = z.number().int().positive().max(60_000).parse(options.timeoutMs ?? 15_000);

  return {
    async publishText(commentary: unknown) {
      let snapshot: ReturnType<typeof linkedInTextPostSnapshot>;
      try {
        snapshot = linkedInTextPostSnapshot({
          authorUrn: config.authorUrn,
          commentary: z.string().parse(commentary),
        });
      } catch {
        throw new LinkedInPublishError("invalid_request");
      }
      let response: Response;
      try {
        response = await request("https://api.linkedin.com/rest/posts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
            "Linkedin-Version": config.apiVersion,
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify(snapshot),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "TimeoutError") throw new LinkedInPublishError("timeout");
        throw new LinkedInPublishError("unavailable");
      }
      if (response.status === 401) throw new LinkedInPublishError("authentication");
      if (response.status === 403) throw new LinkedInPublishError("permission");
      if (response.status === 429) throw new LinkedInPublishError("rate_limit");
      if (!response.ok) throw new LinkedInPublishError("unavailable");
      const postId = postIdSchema.safeParse(response.headers.get("x-restli-id"));
      if (!postId.success) throw new LinkedInPublishError("invalid_response");
      return { postId: postId.data };
    },
  };
}
