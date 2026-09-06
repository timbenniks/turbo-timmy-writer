export type VersionDiffLine = {
  kind: "added" | "removed" | "unchanged";
  text: string;
};

export type VersionDiff = {
  lines: VersionDiffLine[];
  added: number;
  removed: number;
  unchanged: number;
};

const MAX_DIFF_CELLS = 250_000;

function textLines(value: string) {
  return value ? value.replaceAll("\r\n", "\n").split("\n") : [];
}

function boundedFallback(before: readonly string[], after: readonly string[]) {
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - suffix - 1] === after[after.length - suffix - 1]
  ) {
    suffix += 1;
  }

  return [
    ...before.slice(0, prefix).map((text) => ({ kind: "unchanged" as const, text })),
    ...before.slice(prefix, before.length - suffix).map((text) => ({ kind: "removed" as const, text })),
    ...after.slice(prefix, after.length - suffix).map((text) => ({ kind: "added" as const, text })),
    ...before.slice(before.length - suffix).map((text) => ({ kind: "unchanged" as const, text })),
  ];
}

export function diffVersionText(beforeText: string, afterText: string): VersionDiff {
  const before = textLines(beforeText);
  const after = textLines(afterText);
  let lines: VersionDiffLine[];

  if ((before.length + 1) * (after.length + 1) > MAX_DIFF_CELLS) {
    lines = boundedFallback(before, after);
  } else {
    const lengths = Array.from(
      { length: before.length + 1 },
      () => new Uint32Array(after.length + 1),
    );

    for (let left = before.length - 1; left >= 0; left -= 1) {
      for (let right = after.length - 1; right >= 0; right -= 1) {
        lengths[left]![right] = before[left] === after[right]
          ? lengths[left + 1]![right + 1]! + 1
          : Math.max(lengths[left + 1]![right]!, lengths[left]![right + 1]!);
      }
    }

    lines = [];
    let left = 0;
    let right = 0;
    while (left < before.length || right < after.length) {
      if (left < before.length && right < after.length && before[left] === after[right]) {
        lines.push({ kind: "unchanged", text: before[left]! });
        left += 1;
        right += 1;
      } else if (
        right >= after.length ||
        (left < before.length && lengths[left + 1]![right]! >= lengths[left]![right + 1]!)
      ) {
        lines.push({ kind: "removed", text: before[left]! });
        left += 1;
      } else {
        lines.push({ kind: "added", text: after[right]! });
        right += 1;
      }
    }
  }

  return {
    lines,
    added: lines.filter(({ kind }) => kind === "added").length,
    removed: lines.filter(({ kind }) => kind === "removed").length,
    unchanged: lines.filter(({ kind }) => kind === "unchanged").length,
  };
}
