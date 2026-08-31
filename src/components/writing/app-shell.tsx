import {
  ChevronDown,
  Command,
  MoreHorizontal,
  PanelRightClose,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { libraryDestinations } from "@/lib/navigation";

const recentWriting = [
  {
    title: "Larger tools might need fewer tokens",
    detail: "Draft · edited just now",
    active: true,
  },
  {
    title: "The API is the interface",
    detail: "Idea · yesterday",
    active: false,
  },
  {
    title: "Execution density",
    detail: "Published · 24 Aug",
    active: false,
  },
];

type AppShellProps = {
  githubLogin: string;
};

export function AppShell({ githubLogin }: AppShellProps) {
  return (
    <main className="min-h-screen bg-background p-2 text-foreground sm:p-3">
      <div className="mx-auto grid min-h-[calc(100vh-1rem)] max-w-[1800px] overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_70px_rgba(37,32,24,0.08)] sm:min-h-[calc(100vh-1.5rem)] lg:grid-cols-[248px_minmax(0,1fr)_320px]">
        <aside className="hidden border-r border-border bg-sidebar lg:flex lg:flex-col">
          <div className="flex h-16 items-center justify-between px-4">
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-muted">
              <span className="grid size-7 place-items-center rounded-lg bg-foreground font-serif text-sm text-background">
                T
              </span>
              Turbo Timmy
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
            <Button variant="ghost" size="icon" aria-label="More options">
              <MoreHorizontal />
            </Button>
          </div>

          <div className="px-3 pb-3">
            <Button className="w-full justify-start shadow-sm">
              <Plus />
              New article
            </Button>
          </div>

          <nav className="space-y-1 px-3" aria-label="Writing library">
            {libraryDestinations.map(({ label, icon: Icon }, index) => (
              <a
                key={label}
                href="#"
                className={`flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                  index === 0
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </a>
            ))}
          </nav>

          <div className="mt-7 px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Recent writing
          </div>
          <div className="mt-2 space-y-1 px-3">
            {recentWriting.map((item) => (
              <button
                key={item.title}
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-muted"
              >
                <span className="block truncate text-sm text-foreground">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {item.detail}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-auto space-y-1 border-t border-border p-3">
            <button className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              <Search className="size-4" />
              Search
              <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px]">
                ⌘K
              </span>
            </button>
            <button className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              <Settings className="size-4" />
              <span className="min-w-0 flex-1 truncate text-left">
                @{githubLogin}
              </span>
            </button>
            <div className="flex justify-end">
              <SignOutButton />
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col bg-editor">
          <header className="flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6">
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open library">
              <Command />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                Larger tools might need fewer tokens
              </p>
              <p className="text-xs text-muted-foreground">Saved just now</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                1,248 words · 5 min read
              </span>
              <Button variant="ghost" size="icon" aria-label="Close assistant">
                <PanelRightClose />
              </Button>
              <Button size="sm">Share</Button>
            </div>
          </header>

          <article className="mx-auto w-full max-w-[760px] flex-1 px-6 py-14 sm:px-12 sm:py-20">
            <div className="mb-10 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                Draft
              </span>
              <span>AI systems</span>
              <span>·</span>
              <span>Developer experience</span>
            </div>
            <h1 className="font-serif text-4xl leading-[1.08] font-medium tracking-[-0.035em] text-balance sm:text-[3.35rem]">
              Larger tools might need fewer tokens
            </h1>
            <p className="mt-8 font-serif text-[1.2rem] leading-8 text-copy sm:text-[1.32rem] sm:leading-9">
              We keep treating every token in a tool definition as overhead. That
              makes sense when you only look at the prompt. It gets less obvious
              when you look at the work the model does afterward.
            </p>
            <p className="mt-6 font-serif text-[1.2rem] leading-8 text-copy sm:text-[1.32rem] sm:leading-9">
              A richer definition costs more up front, but it might prevent three
              exploratory calls, a malformed request, and a correction loop. The
              smaller prompt can become the expensive option.
            </p>
            <h2 className="mt-14 font-serif text-2xl font-semibold tracking-tight">
              Tokens are not the useful unit
            </h2>
            <p className="mt-5 font-serif text-[1.2rem] leading-8 text-copy sm:text-[1.32rem] sm:leading-9">
              What I want to measure is the full path from intent to a correct
              result. Prompt size matters, but so do reasoning, retries, tool
              calls, latency, and the chance that a human has to step in.
            </p>
          </article>

          <footer className="flex h-11 items-center border-t border-border px-4 text-xs text-muted-foreground sm:px-6">
            <span>Quiet theme</span>
            <span className="ml-auto">Focus mode</span>
          </footer>
        </section>

        <aside className="hidden border-l border-border bg-assistant xl:flex xl:flex-col">
          <header className="flex h-16 items-center border-b border-border px-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-accent" />
              Assistant
            </div>
            <span className="ml-auto rounded-full bg-accent-soft px-2 py-1 text-[10px] font-medium text-accent">
              Quiet
            </span>
          </header>
          <div className="flex-1 px-5 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Working brief
            </p>
            <div className="mt-4 rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-medium text-muted-foreground">Thesis</p>
              <p className="mt-2 text-sm leading-6 text-copy">
                Rich tool definitions can lower total cost when they reduce
                reasoning and retries.
              </p>
              <div className="my-4 h-px bg-border" />
              <p className="text-xs font-medium text-muted-foreground">
                Still unresolved
              </p>
              <p className="mt-2 text-sm leading-6 text-copy">
                What evidence would make this more than a strong hunch?
              </p>
            </div>
          </div>
          <div className="border-t border-border p-4">
            <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Ask about the article...
              </p>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">⌘ Enter</span>
                <Button size="icon" className="size-8" aria-label="Send message">
                  <Sparkles />
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
