"use client";

import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

import type { ArchiveGraphEdge, ArchiveGraphNode } from "@/search/archive/relationships";

export function ArchiveGraphExplorer({
  nodes,
  edges,
}: {
  nodes: ArchiveGraphNode[];
  edges: ArchiveGraphEdge[];
}) {
  const connectedNodeIds = new Set(edges.flatMap((edge) => [edge.sourceId, edge.targetId]));
  const initialId = nodes.find((node) => connectedNodeIds.has(node.id))?.id ?? nodes[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(initialId);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const relationships = useMemo(() => edges
    .filter((edge) => edge.sourceId === selectedId || edge.targetId === selectedId)
    .map((edge) => ({
      edge,
      node: nodeById.get(edge.sourceId === selectedId ? edge.targetId : edge.sourceId),
    }))
    .filter((relationship): relationship is { edge: ArchiveGraphEdge; node: ArchiveGraphNode } => Boolean(relationship.node))
    .slice(0, 8), [edges, nodeById, selectedId]);
  const selected = nodeById.get(selectedId);

  if (!nodes.length) return <p className="text-sm text-muted-foreground">No archive documents are available.</p>;

  return (
    <div>
      <label className="block max-w-xl text-sm font-medium">
        Focus article
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3">
          {nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
        </select>
      </label>
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card" aria-label="Archive relationship graph">
        <svg viewBox="0 0 760 420" role="img" aria-labelledby="archive-graph-title" className="h-auto w-full">
          <title id="archive-graph-title">Shared-tag relationships around {selected?.title}</title>
          {relationships.map(({ edge }, index) => {
            const angle = (Math.PI * 2 * index) / Math.max(relationships.length, 1) - Math.PI / 2;
            const x = 380 + Math.cos(angle) * 260;
            const y = 210 + Math.sin(angle) * 150;
            return <line key={`${edge.sourceId}-${edge.targetId}`} x1="380" y1="210" x2={x} y2={y} stroke="currentColor" className="text-border" strokeWidth={1 + edge.score * 5} />;
          })}
          {relationships.map(({ node }, index) => {
            const angle = (Math.PI * 2 * index) / Math.max(relationships.length, 1) - Math.PI / 2;
            const x = 380 + Math.cos(angle) * 260;
            const y = 210 + Math.sin(angle) * 150;
            return <circle key={node.id} cx={x} cy={y} r="13" fill="currentColor" className="text-accent" />;
          })}
          <circle cx="380" cy="210" r="22" fill="currentColor" className="text-foreground" />
        </svg>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {relationships.map(({ edge, node }) => (
          <button key={node.id} type="button" onClick={() => setSelectedId(node.id)} className="rounded-xl border border-border bg-card p-4 text-left hover:bg-muted">
            <span className="font-medium">{node.title}</span>
            <span className="mt-2 block text-xs text-muted-foreground">{edge.sharedTags.join(" · ")} · {Math.round(edge.score * 100)}% tag overlap</span>
          </button>
        ))}
      </div>
      {selected ? <a href={selected.url} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline">Open focused source <ExternalLink className="size-4" /></a> : null}
    </div>
  );
}
