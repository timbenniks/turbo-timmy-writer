import { describe, expect, it } from "vitest";

import { buildArchiveRelationshipGraph } from "./relationships";

const documents = [
  { id: "a", title: "A", url: "https://example.com/a", tags: ["AI", "DX"] },
  { id: "b", title: "B", url: "https://example.com/b", tags: ["dx", "Web"] },
  { id: "c", title: "C", url: "https://example.com/c", tags: ["AI", "DX"] },
  { id: "d", title: "D", url: "https://example.com/d", tags: ["Speaking"] },
];

describe("archive relationship graph", () => {
  it("builds stable normalized shared-tag edges", () => {
    expect(buildArchiveRelationshipGraph(documents).edges).toEqual([
      { sourceId: "a", targetId: "c", sharedTags: ["ai", "dx"], score: 1 },
      { sourceId: "a", targetId: "b", sharedTags: ["dx"], score: 0.3333 },
      { sourceId: "b", targetId: "c", sharedTags: ["dx"], score: 0.3333 },
    ]);
  });

  it("bounds quadratic graph output explicitly", () => {
    const graph = buildArchiveRelationshipGraph(documents, { nodes: 3, edges: 1 });
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(1);
  });
});
