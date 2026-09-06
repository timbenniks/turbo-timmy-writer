"use client";

import { Command, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { filterCommands, type CommandItem } from "@/commands/model";

const OPEN_COMMAND_PALETTE = "turbo-timmy:open-command-palette";

export function CommandPaletteTrigger({ compact = false }: { compact?: boolean }) {
  return (
    <button
      type="button"
      aria-label="Open command palette"
      onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE))}
      className={compact
        ? "inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted"
        : "workspace-footer-action flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"}
    >
      <Command className="size-4" />
      {compact ? null : (
        <>
          <span className="workspace-footer-label">Commands</span>
          <span className="workspace-footer-label ml-auto rounded border border-border px-1.5 py-0.5 text-[10px]">⌘K</span>
        </>
      )}
    </button>
  );
}

export function CommandPalette({ commands }: { commands: CommandItem[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const filtered = useMemo(() => filterCommands(commands, query), [commands, query]);
  const openPalette = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase("en-US") === "k") {
        event.preventDefault();
        if (open) setOpen(false);
        else openPalette();
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }
    function onOpen() {
      openPalette();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE, onOpen);
    };
  }, [open, openPalette]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  function choose(command: CommandItem) {
    setOpen(false);
    router.push(command.href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section role="dialog" aria-modal="true" aria-label="Command palette" className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(index + 1, filtered.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && filtered[active]) {
                event.preventDefault();
                choose(filtered[active]);
              }
            }}
            aria-label="Search commands"
            placeholder="Type a command or article title…"
            className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button type="button" aria-label="Close command palette" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {filtered.length ? filtered.map((command, index) => (
            <button
              key={command.id}
              type="button"
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(command)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${index === active ? "bg-muted" : "hover:bg-muted"}`}
            >
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{command.label}</span>
              <span className="text-[11px] text-muted-foreground">{command.group}</span>
            </button>
          )) : (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">No matching commands.</p>
          )}
        </div>
      </section>
    </div>
  );
}
