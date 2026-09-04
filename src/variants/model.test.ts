import { describe, expect, it } from "vitest";

import { emptyArticleDocument } from "@/editor/document";
import { hashCanonicalArticle, hashVariant } from "./hashing";
import {
  regenerationGuard,
  regenerationDecision,
  variantFreshness,
  variantMetadataSchema,
} from "./model";

describe("publication variants", () => {
  it("detects canonical revision and content changes deterministically", () => {
    const source = { sourceArticleRevision: 4, sourceContentHash: "a".repeat(64) };

    expect(variantFreshness(source, source)).toEqual({
      stale: false,
      revisionChanged: false,
      contentChanged: false,
    });
    expect(variantFreshness(source, {
      sourceArticleRevision: 5,
      sourceContentHash: "b".repeat(64),
    })).toEqual({ stale: true, revisionChanged: true, contentChanged: true });
  });

  it("requires confirmation before regenerating manual edits", () => {
    expect(regenerationGuard({ hasManualEdits: true, confirmed: false })).toEqual({
      allowed: false,
      snapshotRequired: true,
    });
    expect(regenerationGuard({ hasManualEdits: true, confirmed: true }).allowed).toBe(true);
  });

  it("hashes canonical and destination content without key-order drift", () => {
    expect(hashCanonicalArticle({ title: "A", documentJson: emptyArticleDocument }))
      .toMatch(/^[a-f0-9]{64}$/);
    const content = { version: 1 as const, destination: "linkedin-post" as const, bodyMarkdown: "A take" };
    const metadata = { version: 1 as const, destination: "linkedin-post" as const, publicationUrl: null };
    expect(hashVariant({ content, metadata })).toBe(hashVariant({ metadata, content }));
  });

  it("keeps destination metadata independently typed", () => {
    expect(variantMetadataSchema.safeParse({
      version: 1,
      destination: "newsletter",
      subject: "A useful subject",
      previewText: "Preview",
    }).success).toBe(true);
    expect(variantMetadataSchema.safeParse({
      version: 1,
      destination: "newsletter",
      publicationUrl: null,
    }).success).toBe(false);
  });

  it("rejects a second regeneration decision after the first advances revision", () => {
    const request = {
      expectedArticleRevision: 7,
      currentArticleRevision: 7,
      expectedVariantRevision: 3,
      hasManualEdits: false,
      confirmed: false,
    };
    expect(regenerationDecision({ ...request, currentVariantRevision: 3 })).toBe("ready");
    expect(regenerationDecision({ ...request, currentVariantRevision: 4 })).toBe("variant-conflict");
  });

  it("rejects non-web publication URLs", () => {
    expect(variantMetadataSchema.safeParse({
      version: 1,
      destination: "linkedin-post",
      publicationUrl: "javascript:alert(1)",
    }).success).toBe(false);
  });
});
