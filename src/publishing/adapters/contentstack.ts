import "server-only";

import { z } from "zod";

const entryFieldsSchema = z.record(z.string().trim().min(1).max(200), z.json());
const entryResponseSchema = z.object({
  entry: z.object({
    uid: z.string().min(1).max(200),
    title: z.string().max(500).optional(),
    _version: z.number().int().positive().optional(),
    created_at: z.iso.datetime({ offset: true }).optional(),
    updated_at: z.iso.datetime({ offset: true }).optional(),
  }),
});

export class ContentstackError extends Error {
  constructor(readonly code: "invalid_request" | "authentication" | "rate_limit" | "timeout" | "unavailable" | "invalid_response") {
    const messages = {
      invalid_request: "The Contentstack draft entry is invalid.",
      authentication: "Contentstack rejected the configured credentials.",
      rate_limit: "Contentstack's request limit has been reached.",
      timeout: "Contentstack did not respond in time.",
      unavailable: "Contentstack could not create the draft entry.",
      invalid_response: "Contentstack returned an invalid draft entry response.",
    } as const;
    super(messages[code]);
    this.name = "ContentstackError";
  }
}

export function createContentstackDraftAdapter(options: {
  apiHost: string;
  apiKey: string;
  managementToken: string;
  contentTypeUid: string;
  locale: string;
  branch: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}) {
  const config = z.object({
    apiHost: z.url().startsWith("https://"),
    apiKey: z.string().trim().min(1).max(500),
    managementToken: z.string().trim().min(1).max(1_000),
    contentTypeUid: z.string().trim().regex(/^[a-z0-9_]+$/).max(200),
    locale: z.string().trim().regex(/^[a-z]{2}(?:-[a-z]{2})?$/i),
    branch: z.string().trim().min(1).max(200),
  }).parse(options);
  const request = options.fetch ?? fetch;
  const timeoutMs = z.number().int().positive().max(60_000).parse(options.timeoutMs ?? 15_000);

  return {
    async createDraft(entry: unknown) {
      const parsed = entryFieldsSchema.safeParse(entry);
      const requestBody = parsed.success ? JSON.stringify({ entry: parsed.data }) : "";
      if (!parsed.success || new TextEncoder().encode(requestBody).byteLength > 500_000) {
        throw new ContentstackError("invalid_request");
      }
      let response: Response;
      try {
        const host = config.apiHost.replace(/\/$/u, "");
        response = await request(
          `${host}/v3/content_types/${encodeURIComponent(config.contentTypeUid)}/entries?locale=${encodeURIComponent(config.locale.toLowerCase())}`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              api_key: config.apiKey,
              authorization: config.managementToken,
              branch: config.branch,
              "Content-Type": "application/json",
            },
            body: requestBody,
            signal: AbortSignal.timeout(timeoutMs),
          },
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "TimeoutError") throw new ContentstackError("timeout");
        throw new ContentstackError("unavailable");
      }
      if ([401, 403, 412].includes(response.status)) throw new ContentstackError("authentication");
      if (response.status === 429) throw new ContentstackError("rate_limit");
      if (!response.ok) throw new ContentstackError("unavailable");
      const result = entryResponseSchema.safeParse(await response.json().catch(() => null));
      if (!result.success) throw new ContentstackError("invalid_response");
      return result.data.entry;
    },
  };
}
