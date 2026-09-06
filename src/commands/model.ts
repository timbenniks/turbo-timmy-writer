import type { Route } from "next";

export type CommandItem = {
  id: string;
  label: string;
  group: "Navigate" | "Article" | "Recent";
  href: Route;
  keywords?: string;
};

export function filterCommands(commands: readonly CommandItem[], query: string) {
  const terms = query
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return [...commands];

  return commands.filter((command) => {
    const haystack = `${command.label} ${command.group} ${command.keywords ?? ""}`
      .normalize("NFKC")
      .toLocaleLowerCase("en-US");
    return terms.every((term) => haystack.includes(term));
  });
}
