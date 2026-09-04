import { ExternalLink } from "lucide-react";

type ArchiveDocumentSummary = {
  id: string;
  title: string;
  url: string;
  publishedAt: Date;
  bodyText: string;
  tags: string[];
  source: string;
  destination: string;
};

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(date);
}

export function ArchiveLibrary({ documents }: { documents: ArchiveDocumentSummary[] }) {
  return (
    <>
      <header className="flex min-h-16 shrink-0 items-center border-b border-border px-5 sm:px-6">
        <div>
          <p className="text-sm font-medium">Published archive</p>
          <p className="text-xs text-muted-foreground">{documents.length} source documents</p>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Writing memory
          </p>
          <h1 className="mt-3 font-serif text-4xl tracking-[-0.035em] sm:text-5xl">
            Published archive
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Imported source writing used for attributed retrieval. It remains separate from editable articles and voice guidance.
          </p>
          <div className="mt-10 divide-y divide-border border-y border-border">
            {documents.map((document) => (
              <article key={document.id} className="py-5 sm:px-4">
                <a
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-2 font-serif text-xl hover:text-accent"
                >
                  <span className="truncate">{document.title}</span>
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {document.bodyText}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <time dateTime={document.publishedAt.toISOString()}>
                    {dateLabel(document.publishedAt)}
                  </time>
                  <span>·</span>
                  <span>{document.source}</span>
                  {document.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded-full border border-border px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
