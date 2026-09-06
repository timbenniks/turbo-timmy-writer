export const portableBackupVersion = 1 as const;

export function portableBackupFilename(exportedAt: Date) {
  return `turbo-timmy-writer-${exportedAt.toISOString().slice(0, 10)}.json`;
}
