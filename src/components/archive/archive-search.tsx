import { ExternalLink, Search } from "lucide-react";

import type {
  ArchiveSearchMode,
  ArchiveSearchResult,
} from "@/search/retrieval/model";

const modes: { value: ArchiveSearchMode; label: string }[] = [
  { value: "hybrid", label: "Hybrid" },
  { value: "literal", label: "Literal" },
  { value: "semantic", label: "Semantic" },
];

function score(value: number) {
  return value.toFixed(3);
}

export function ArchiveSearch({
  query,
  mode,
  results,
  error,
}: {
  query: string;
  mode: ArchiveSearchMode;
  results: ArchiveSearchResult[];
  error?: string;
}) {
  return (
    <>
      <header className="flex min-h-16 shrink-0 items-center border-b border-border px-5 sm:px-6">
        <div>
          <p className="text-sm font-medium">Search writing memory</p>
          <p className="text-xs text-muted-foreground">
            {query ? `${results.length} ranked passages` : "Literal, semantic, or hybrid"}
          </p>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Archive retrieval
          </p>
          <h1 className="mt-3 font-serif text-4xl tracking-[-0.035em] sm:text-5xl">
            Find what you wrote before.
          </h1>
          <form className="mt-8 rounded-2xl border border-border bg-surface p-4" action="/search">
            <label htmlFor="archive-query" className="sr-only">Search the archive</label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                <input
                  id="archive-query"
                  name="q"
                  defaultValue={query}
                  minLength={2}
                  maxLength={500}
                  placeholder="Web performance, composable architecture, developer experience…"
                  className="h-10 w-full rounded-lg border border-border bg-editor pl-9 pr-3 text-sm outline-none focus:border-accent"
                />
              </div>
              <button type="submit" className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background">
                Search
              </button>
            </div>
            <fieldset className="mt-3 flex gap-2" aria-label="Ranking mode">
              {modes.map((item) => (
                <label key={item.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value={item.value}
                    defaultChecked={mode === item.value}
                    className="peer sr-only"
                  />
                  <span className="block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent">
                    {item.label}
                  </span>
                </label>
              ))}
            </fieldset>
          </form>

          {error ? (
            <p role="alert" className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {query && !error ? (
            results.length ? (
              <div className="mt-8 space-y-4">
                {results.map((result) => (
                  <article key={result.chunkId} className="rounded-2xl border border-border bg-surface p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-full items-center gap-2 font-serif text-xl hover:text-accent"
                        >
                          <span className="truncate">{result.title}</span>
                          <ExternalLink className="size-3.5 shrink-0" />
                        </a>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {result.source} · passage {result.chunkOrdinal + 1}
                        </p>
                      </div>
                      <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[11px] text-accent">
                        {score(result.score)}
                      </span>
                    </div>
                    <p className="mt-4 line-clamp-6 whitespace-pre-line text-sm leading-6 text-foreground/85">
                      {result.passage}
                    </p>
                    <details className="mt-4 text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Why this ranked</summary>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                        <span>literal {result.ranking.literal.raw === null ? "—" : score(result.ranking.literal.raw)} × {result.ranking.literal.weight}</span>
                        <span>semantic {result.ranking.semantic.raw === null ? "—" : score(result.ranking.semantic.raw)} × {result.ranking.semantic.weight}</span>
                      </div>
                    </details>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-10 text-sm text-muted-foreground">No attributed passages matched this query.</p>
            )
          ) : (
            <p className="mt-10 max-w-xl text-sm leading-6 text-muted-foreground">
              Hybrid search balances exact language with conceptual similarity. Ranking details stay visible so retrieval can be tuned without becoming mysterious.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
