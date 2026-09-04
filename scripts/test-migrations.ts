import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";

async function main() {
  const migrationsDirectory = path.resolve("src/db/migrations");
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((fileName) => /^\d+.*\.sql$/.test(fileName))
    .sort();

  if (migrationFiles.length === 0) throw new Error("No database migrations found.");

  const database = new PGlite();

  try {
    for (const migrationFile of migrationFiles) {
      const sql = await readFile(
        path.join(migrationsDirectory, migrationFile),
        "utf8",
      );
      const statements = sql
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean);

      for (const statement of statements) await database.exec(statement);
    }

    const result = await database.query<{ count: number }>(`
      select count(*)::integer as count
      from information_schema.tables
      where table_schema = 'public'
    `);
    console.log(
      JSON.stringify(
        {
          mode: "empty-database",
          migrations: migrationFiles.length,
          publicTables: result.rows[0]?.count ?? 0,
        },
        null,
        2,
      ),
    );
  } finally {
    await database.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Migration test failed.");
  process.exitCode = 1;
});
