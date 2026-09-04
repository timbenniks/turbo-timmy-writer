import { describe, expect, it } from "vitest";

import { planArchiveDocumentImport } from "../src/search/archive/model";
import { parseArchiveSource } from "./import-archive";

function publishedSource(body = "A **specific** point from the archive.") {
  return [
    "---",
    "id: 42",
    "title: A useful memory",
    "slug: useful-memory",
    "date: '2025-02-03T10:00:00Z'",
    "canonical_url: https://timbenniks.dev/writing/useful-memory",
    "tags: [AI, 'Web  development', ai]",
    "draft: false",
    "nested:",
    "  evidence: true",
    "---",
    "",
    body,
  ].join("\n");
}

describe("archive import", () => {
  it("parses published source into attributed, hashable archive content", () => {
    const document = parseArchiveSource("useful-memory.md", publishedSource());

    expect(document).toMatchObject({
      sourceKey: "useful-memory.md",
      title: "A useful memory",
      url: "https://timbenniks.dev/writing/useful-memory",
      publishedAt: "2025-02-03T10:00:00.000Z",
      bodyText: "A specific point from the archive.",
      tags: ["AI", "Web development"],
      source: "timbenniks.dev",
      destination: "website",
      metadata: {
        importVersion: 1,
        sourceFile: "useful-memory.md",
        sourceId: "42",
        slug: "useful-memory",
      },
    });
    expect(document?.sourceMarkup).toContain("**specific**");
    expect(document?.metadata.frontmatter).toMatchObject({ nested: { evidence: true } });
    expect(document?.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("skips drafts and derives a canonical URL when one is absent", () => {
    expect(parseArchiveSource("draft.md", publishedSource().replace("draft: false", "draft: true"))).toBeNull();

    const document = parseArchiveSource(
      "fallback.md",
      publishedSource().replace("canonical_url: https://timbenniks.dev/writing/useful-memory\n", ""),
    );
    expect(document?.url).toBe("https://timbenniks.dev/writing/useful-memory");
  });

  it("changes hashes only when normalized imported content changes", () => {
    const first = parseArchiveSource("useful-memory.md", publishedSource());
    const same = parseArchiveSource("useful-memory.md", publishedSource());
    const changed = parseArchiveSource("useful-memory.md", publishedSource("A changed point."));

    expect(first?.contentHash).toBe(same?.contentHash);
    expect(first?.contentHash).not.toBe(changed?.contentHash);
  });

  it("plans inserts, updates, unchanged documents, and removals deterministically", () => {
    const unchanged = parseArchiveSource("unchanged.md", publishedSource());
    const updated = parseArchiveSource("updated.md", publishedSource("Updated body."));
    if (!unchanged || !updated) throw new Error("Expected published fixtures.");

    expect(planArchiveDocumentImport([
      { sourceKey: "unchanged.md", contentHash: unchanged.contentHash },
      { sourceKey: "updated.md", contentHash: "0".repeat(64) },
      { sourceKey: "removed.md", contentHash: "1".repeat(64) },
    ], [unchanged, updated, { ...updated, sourceKey: "inserted.md" }])).toEqual({
      inserted: ["inserted.md"],
      updated: ["updated.md"],
      unchanged: ["unchanged.md"],
      removed: ["removed.md"],
    });
  });
});
