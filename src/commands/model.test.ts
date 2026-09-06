import { describe, expect, it } from "vitest";

import { filterCommands, type CommandItem } from "./model";

const commands: CommandItem[] = [
  { id: "new", label: "New article", group: "Navigate", href: "/start", keywords: "premise" },
  { id: "history", label: "Version history", group: "Article", href: "/articles/one/history" as CommandItem["href"], keywords: "compare restore" },
];

describe("filterCommands", () => {
  it("matches normalized labels, groups, and keywords", () => {
    expect(filterCommands(commands, "  ReStore HISTORY ").map(({ id }) => id))
      .toEqual(["history"]);
  });

  it("returns the stable command order for a blank query", () => {
    expect(filterCommands(commands, "").map(({ id }) => id)).toEqual(["new", "history"]);
  });
});
