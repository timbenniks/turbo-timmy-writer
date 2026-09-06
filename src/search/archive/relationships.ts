export type ArchiveGraphNode = {
  id: string;
  title: string;
  url: string;
  tags: string[];
};

export type ArchiveGraphEdge = {
  sourceId: string;
  targetId: string;
  sharedTags: string[];
  score: number;
};

function normalizedTags(tags: readonly string[]) {
  return new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean));
}

export function buildArchiveRelationshipGraph(
  documents: readonly ArchiveGraphNode[],
  limits: { nodes?: number; edges?: number } = {},
) {
  const nodes = documents.slice(0, limits.nodes ?? 100);
  const edges: ArchiveGraphEdge[] = [];
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    const left = nodes[leftIndex]!;
    const leftTags = normalizedTags(left.tags);
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const right = nodes[rightIndex]!;
      const rightTags = normalizedTags(right.tags);
      const sharedTags = [...leftTags].filter((tag) => rightTags.has(tag)).sort();
      if (!sharedTags.length) continue;
      const unionSize = new Set([...leftTags, ...rightTags]).size;
      edges.push({
        sourceId: left.id,
        targetId: right.id,
        sharedTags,
        score: Number((sharedTags.length / unionSize).toFixed(4)),
      });
    }
  }
  edges.sort((left, right) =>
    right.score - left.score
    || left.sourceId.localeCompare(right.sourceId)
    || left.targetId.localeCompare(right.targetId));
  return { nodes, edges: edges.slice(0, limits.edges ?? 300) };
}
