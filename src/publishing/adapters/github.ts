import "server-only";

import { Buffer } from "node:buffer";

import { z } from "zod";

const githubApiVersion = "2022-11-28";
const githubRepositorySchema = z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
const githubBranchSchema = z.string().trim().min(1).max(255)
  .refine((branch) => !branch.startsWith("-") && !branch.includes(".."));
const githubPathSchema = z.string().trim().min(1).max(1_024)
  .refine((path) => !path.startsWith("/") && !path.split("/").includes(".."));
const githubShaSchema = z.string().regex(/^[a-f0-9]{40}$/);

const githubFileSchema = z.object({
  type: z.literal("file"),
  path: githubPathSchema,
  sha: githubShaSchema,
  html_url: z.url().nullable(),
});

const githubWriteResponseSchema = z.object({
  content: z.object({
    path: githubPathSchema,
    sha: githubShaSchema,
    html_url: z.url().nullable(),
  }).nullable(),
  commit: z.object({
    sha: githubShaSchema,
    html_url: z.url(),
  }),
});

type GitHubPublisherOptions = {
  token: string;
  allowedRepositories: readonly string[];
  fetch?: typeof fetch;
  timeoutMs?: number;
};

type GitHubFileInput = {
  repository: string;
  path: string;
  branch?: string;
  signal?: AbortSignal;
};

type GitHubWriteInput = GitHubFileInput & {
  message: string;
  markdown: string;
  expectedSha?: string;
};

class GitHubPublisherError extends Error {
  constructor(
    readonly code:
      | "forbidden_repository"
      | "invalid_request"
      | "github_authentication"
      | "github_conflict"
      | "github_rate_limit"
      | "github_timeout"
      | "github_unavailable"
      | "github_request_failed"
      | "invalid_response",
    message: string,
    readonly status?: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "GitHubPublisherError";
  }
}

function safeRequest(input: GitHubFileInput) {
  const repository = githubRepositorySchema.parse(input.repository);
  const path = githubPathSchema.parse(input.path);
  const branch = githubBranchSchema.parse(input.branch ?? "main");
  return { repository, path, branch };
}

function publisherError(response: Response) {
  const requestId = response.headers.get("x-github-request-id") ?? undefined;
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    return new GitHubPublisherError(
      "github_rate_limit",
      "GitHub's publication rate limit has been reached.",
      response.status,
      requestId,
    );
  }
  if (response.status === 401 || response.status === 403) {
    return new GitHubPublisherError(
      "github_authentication",
      "GitHub rejected the publisher credentials.",
      response.status,
      requestId,
    );
  }
  if (response.status === 409 || response.status === 422) {
    return new GitHubPublisherError(
      "github_conflict",
      "The repository changed before this publication could be committed.",
      response.status,
      requestId,
    );
  }
  if (response.status >= 500) {
    return new GitHubPublisherError(
      "github_unavailable",
      "GitHub is temporarily unavailable.",
      response.status,
      requestId,
    );
  }
  return new GitHubPublisherError(
    "github_request_failed",
    "GitHub could not complete the publication request.",
    response.status,
    requestId,
  );
}

export function createGitHubPublisher(options: GitHubPublisherOptions) {
  const token = z.string().trim().min(1).parse(options.token);
  const allowedRepositories = new Set(
    z.array(githubRepositorySchema).min(1).parse(options.allowedRepositories),
  );
  const request = options.fetch ?? fetch;
  const timeoutMs = z.number().int().positive().max(60_000)
    .parse(options.timeoutMs ?? 15_000);

  function requestUrl(input: ReturnType<typeof safeRequest>) {
    const [owner, repository] = input.repository.split("/");
    return `https://api.github.com/repos/${encodeURIComponent(owner!)}/${encodeURIComponent(repository!)}/contents/${input.path.split("/").map(encodeURIComponent).join("/")}`;
  }

  function assertAllowed(repository: string) {
    if (!allowedRepositories.has(repository)) {
      throw new GitHubPublisherError(
        "forbidden_repository",
        "This repository is not configured for publication.",
      );
    }
  }

  async function githubFetch(
    url: string,
    init: RequestInit,
    callerSignal?: AbortSignal,
  ) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal;
    try {
      return await request(url, {
        ...init,
        signal,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "turbo-timmy-writer",
          "X-GitHub-Api-Version": githubApiVersion,
          ...init.headers,
        },
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new GitHubPublisherError("github_timeout", "GitHub did not respond in time.");
      }
      if (error instanceof DOMException && error.name === "AbortError" && callerSignal?.aborted) {
        throw error;
      }
      throw new GitHubPublisherError(
        "github_request_failed",
        "GitHub could not complete the publication request.",
      );
    }
  }

  return {
    async inspectFile(input: GitHubFileInput) {
      let parsed: ReturnType<typeof safeRequest>;
      try {
        parsed = safeRequest(input);
      } catch {
        throw new GitHubPublisherError("invalid_request", "Invalid repository file request.");
      }
      assertAllowed(parsed.repository);
      const response = await githubFetch(
        `${requestUrl(parsed)}?ref=${encodeURIComponent(parsed.branch)}`,
        { method: "GET" },
        input.signal,
      );
      if (response.status === 404) return null;
      if (!response.ok) throw publisherError(response);
      const result = githubFileSchema.safeParse(await response.json());
      if (!result.success) {
        throw new GitHubPublisherError("invalid_response", "GitHub returned an invalid file response.");
      }
      return result.data;
    },

    async writeFile(input: GitHubWriteInput) {
      let parsed: ReturnType<typeof safeRequest>;
      let message: string;
      let markdown: string;
      let expectedSha: string | undefined;
      try {
        parsed = safeRequest(input);
        message = z.string().trim().min(1).max(500).parse(input.message);
        markdown = z.string().max(500_000).parse(input.markdown);
        expectedSha = input.expectedSha
          ? githubShaSchema.parse(input.expectedSha)
          : undefined;
      } catch {
        throw new GitHubPublisherError("invalid_request", "Invalid repository write request.");
      }
      assertAllowed(parsed.repository);
      const response = await githubFetch(
        requestUrl(parsed),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            content: Buffer.from(markdown, "utf8").toString("base64"),
            branch: parsed.branch,
            ...(expectedSha ? { sha: expectedSha } : {}),
          }),
        },
        input.signal,
      );
      if (!response.ok) throw publisherError(response);
      const result = githubWriteResponseSchema.safeParse(await response.json());
      if (!result.success) {
        throw new GitHubPublisherError("invalid_response", "GitHub returned an invalid write response.");
      }
      return result.data;
    },
  };
}
