import "server-only";

import { z } from "zod";

const draftInputSchema = z.object({
  subject: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(500_000),
});

const draftResponseSchema = z.object({
  id: z.string().min(1).max(200),
  status: z.literal("draft"),
  subject: z.string().max(500),
});

export type ButtondownDraft = z.infer<typeof draftResponseSchema>;

export class ButtondownError extends Error {
  constructor(
    readonly code: "invalid_request" | "authentication" | "rate_limit" | "timeout" | "unavailable" | "invalid_response",
  ) {
    const messages = {
      invalid_request: "The newsletter draft is invalid.",
      authentication: "Buttondown rejected the configured credential.",
      rate_limit: "Buttondown's request limit has been reached.",
      timeout: "Buttondown did not respond in time.",
      unavailable: "Buttondown could not create the newsletter draft.",
      invalid_response: "Buttondown returned an invalid draft response.",
    } as const;
    super(messages[code]);
    this.name = "ButtondownError";
  }
}

export function createButtondownAdapter(options: {
  apiKey: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}) {
  const apiKey = z.string().trim().min(1).max(500).parse(options.apiKey);
  const request = options.fetch ?? fetch;
  const timeoutMs = z.number().int().positive().max(60_000).parse(options.timeoutMs ?? 15_000);

  return {
    async createDraft(input: unknown) {
      const parsed = draftInputSchema.safeParse(input);
      if (!parsed.success) throw new ButtondownError("invalid_request");
      let response: Response;
      try {
        response = await request("https://api.buttondown.com/v1/emails", {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Token ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...parsed.data, status: "draft" }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "TimeoutError") {
          throw new ButtondownError("timeout");
        }
        throw new ButtondownError("unavailable");
      }
      if (response.status === 401 || response.status === 403) throw new ButtondownError("authentication");
      if (response.status === 429) throw new ButtondownError("rate_limit");
      if (!response.ok) throw new ButtondownError("unavailable");
      const result = draftResponseSchema.safeParse(await response.json().catch(() => null));
      if (!result.success) throw new ButtondownError("invalid_response");
      return result.data;
    },
  };
}
