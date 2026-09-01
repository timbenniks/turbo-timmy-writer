import { describe, expect, it } from "vitest";

import { emptyArticleDocument } from "@/editor/document";

import {
  articleRecoveryEnvelopeSchema,
  decideArticleRecovery,
  parseArticleRecoveryEnvelope,
  type ArticleRecoveryEnvelope,
} from "./recovery";

const envelope: ArticleRecoveryEnvelope = {
  version: 1,
  articleId: "5b0f8636-fdeb-45f3-8a44-ddd326bea5c8",
  clientId: "tab-a",
  baseRevision: 3,
  changeRevision: 2,
  documentVersion: 1,
  title: "Recovered title",
  documentJson: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Local work" }] }],
  },
  updatedAt: "2026-09-01T09:00:00.000Z",
};

const server = {
  articleId: envelope.articleId,
  revision: 3,
  title: "Server title",
  documentJson: emptyArticleDocument,
};

describe("article recovery envelopes", () => {
  it("parses valid local recovery data and rejects malformed storage", () => {
    expect(parseArticleRecoveryEnvelope(JSON.stringify(envelope))).toEqual(envelope);
    expect(parseArticleRecoveryEnvelope("not json")).toBeNull();
    expect(
      articleRecoveryEnvelopeSchema.safeParse({ ...envelope, baseRevision: 0 }).success,
    ).toBe(false);
  });

  it("recovers local work based on the currently open server revision", () => {
    expect(decideArticleRecovery(envelope, server)).toEqual({
      kind: "recover",
      envelope,
    });
  });

  it("surfaces a conflict when the server revision moved ahead", () => {
    expect(decideArticleRecovery(envelope, { ...server, revision: 4 })).toEqual({
      kind: "conflict",
      envelope,
    });
  });

  it("discards a recovery copy already represented by the server", () => {
    expect(
      decideArticleRecovery(envelope, {
        ...server,
        title: envelope.title,
        documentJson: envelope.documentJson,
      }),
    ).toEqual({ kind: "discard" });
  });
});
