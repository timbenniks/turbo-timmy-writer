import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";

async function main() {
  const migrationsDirectory = path.resolve("src/db/migrations");
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((fileName) => /^\d+.*\.sql$/.test(fileName))
    .sort();

  if (migrationFiles.length === 0) throw new Error("No database migrations found.");

  const database = new PGlite({ extensions: { vector } });

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

    const result = await database.query<{
      count: number;
      vectorEnabled: boolean;
      embeddingType: string | null;
    }>(`
      select
        (
          select count(*)::integer
          from information_schema.tables
          where table_schema = 'public'
        ) as count,
        exists(select 1 from pg_extension where extname = 'vector') as "vectorEnabled",
        (
          select format_type(attribute.atttypid, attribute.atttypmod)
          from pg_attribute as attribute
          join pg_class as relation on relation.oid = attribute.attrelid
          where relation.relname = 'archive_chunks'
            and attribute.attname = 'embedding'
        ) as "embeddingType"
    `);
    const verification = result.rows[0];
    if (
      !verification?.vectorEnabled ||
      verification.embeddingType !== "vector(1024)"
    ) {
      throw new Error("The pgvector archive migration was not applied correctly.");
    }
    console.log(
      JSON.stringify(
        {
          mode: "empty-database",
          migrations: migrationFiles.length,
          publicTables: verification.count,
          vectorEnabled: verification.vectorEnabled,
          embeddingType: verification.embeddingType,
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
