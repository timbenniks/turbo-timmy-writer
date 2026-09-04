import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { neon } from "@neondatabase/serverless";
import { fromMarkdown } from "mdast-util-from-markdown";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

import {
  ARCHIVE_IMPORT_VERSION,
  TIMBENNIKS_ARCHIVE_SOURCE,
  WEBSITE_ARCHIVE_DESTINATION,
  archiveDocumentContentHash,
  archiveDocumentImportSchema,
  normalizeJsonValue,
  planArchiveDocumentImport,
  type ArchiveDocumentImport,
} from "../src/search/archive/model";

const frontmatterSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    slug: z.string().trim().min(1),
    title: z.string().trim().min(1),
    date: z.union([z.string(), z.number(), z.date()]),
    canonical_url: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().trim().min(1).optional(),
    ),
    tags: z.array(z.string()),
    draft: z.boolean().optional().default(false),
  })
  .loose();

type MarkdownNode = {
  type: string;
  value?: string;
  alt?: string | null;
  children?: MarkdownNode[];
};

function markdownNodeText(node: MarkdownNode): string {
  if (["text", "inlineCode", "code"].includes(node.type)) return node.value ?? "";
  if (node.type === "image") return node.alt ?? "";
  if (node.type === "break") return "\n";
  if (node.type === "thematicBreak") return "";

  const children = node.children ?? [];
  const separator = ["root", "blockquote", "list", "listItem"].includes(node.type)
    ? "\n\n"
    : "";
  return children.map(markdownNodeText).filter(Boolean).join(separator);
}

export function markdownToArchiveText(markdown: string) {
  return markdownNodeText(fromMarkdown(markdown) as MarkdownNode)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizedTags(tags: readonly string[]) {
  const unique = new Map<string, string>();
  for (const value of tags) {
    const label = value.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!label) continue;
    const key = label.toLocaleLowerCase("en-US");
    if (!unique.has(key)) unique.set(key, label);
  }
  return [...unique.values()];
}

export function parseArchiveSource(
  sourceFile: string,
  source: string,
): ArchiveDocumentImport | null {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) throw new Error(`${sourceFile} has no YAML frontmatter.`);

  const parsed = frontmatterSchema.safeParse(parseYaml(match[1]));
  if (!parsed.success) {
    throw new Error(
      `${sourceFile} has invalid archive frontmatter: ${z.prettifyError(parsed.error)}`,
    );
  }
  if (parsed.data.draft) return null;

  const sourceMarkup = source.slice(match[0].length).trim();
  const bodyText = markdownToArchiveText(sourceMarkup);
  if (!bodyText) throw new Error(`${sourceFile} has no published body text.`);

  const publishedAt = new Date(parsed.data.date);
  if (Number.isNaN(publishedAt.valueOf())) {
    throw new Error(`${sourceFile} has an invalid publication date.`);
  }

  const url =
    parsed.data.canonical_url ??
    new URL(
      `/writing/${parsed.data.slug}`,
      "https://timbenniks.dev",
    ).toString();
  if (!z.url().safeParse(url).success) {
    throw new Error(`${sourceFile} has an invalid canonical URL.`);
  }

  const frontmatter = normalizeJsonValue(parsed.data);
  if (
    frontmatter === null ||
    Array.isArray(frontmatter) ||
    typeof frontmatter !== "object"
  ) {
    throw new Error(`${sourceFile} frontmatter did not normalize to an object.`);
  }

  const documentWithoutHash: Omit<ArchiveDocumentImport, "contentHash"> = {
    sourceKey: sourceFile,
    title: parsed.data.title,
    url,
    publishedAt: publishedAt.toISOString(),
    bodyText,
    sourceMarkup,
    tags: normalizedTags(parsed.data.tags),
    source: TIMBENNIKS_ARCHIVE_SOURCE,
    destination: WEBSITE_ARCHIVE_DESTINATION,
    metadata: {
      importVersion: ARCHIVE_IMPORT_VERSION,
      sourceFile,
      sourceId: parsed.data.id === undefined ? null : String(parsed.data.id),
      slug: parsed.data.slug,
      frontmatter,
    },
  };

  return archiveDocumentImportSchema.parse({
    ...documentWithoutHash,
    contentHash: archiveDocumentContentHash(documentWithoutHash),
  });
}

export async function readArchiveDocuments(directory: string) {
  const sourceFiles = (await readdir(directory))
    .filter((fileName) => fileName.endsWith(".md") && fileName !== "index.md")
    .sort();
  const documents: ArchiveDocumentImport[] = [];
  let draftsSkipped = 0;

  for (const sourceFile of sourceFiles) {
    const source = await readFile(path.join(directory, sourceFile), "utf8");
    const document = parseArchiveSource(sourceFile, source);
    if (document) documents.push(document);
    else draftsSkipped += 1;
  }

  if (documents.length === 0) {
    throw new Error("Refusing to import an archive with no published documents.");
  }
  const sourceKeys = new Set(documents.map((document) => document.sourceKey));
  if (sourceKeys.size !== documents.length) {
    throw new Error("Archive source keys are not unique.");
  }

  return { documents, draftsSkipped };
}

const existingRowsSchema = z.array(
  z.object({
    source_key: z.string(),
    content_hash: z.string(),
  }),
);

async function main() {
  const sourceArgument = process.argv.find((argument) =>
    argument.startsWith("--source="),
  );
  const sourceDirectory = sourceArgument?.slice("--source=".length);
  const shouldWrite = process.argv.includes("--write");
  const githubLogin = process.env.ALLOWED_GITHUB_LOGIN;

  if (!sourceDirectory) {
    throw new Error("Pass --source=/path/to/content/4.writing.");
  }
  if (!githubLogin) {
    throw new Error("ALLOWED_GITHUB_LOGIN is required to select the archive owner.");
  }

  const { documents, draftsSkipped } =
    await readArchiveDocuments(sourceDirectory);
  const baseSummary = {
    source: TIMBENNIKS_ARCHIVE_SOURCE,
    destination: WEBSITE_ARCHIVE_DESTINATION,
    publishedDocuments: documents.length,
    draftsSkipped,
    uniqueTags: new Set(documents.flatMap((document) => document.tags)).size,
  };

  if (!shouldWrite) {
    console.log(JSON.stringify({ mode: "dry-run", ...baseSummary }, null, 2));
    return;
  }

  const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL_UNPOOLED is required for archive writes.");
  }

  const sql = neon(databaseUrl);
  const ownerRows = await sql`
    select id from users where lower(github_login) = lower(${githubLogin}) limit 2
  `;
  if (ownerRows.length !== 1 || typeof ownerRows[0]?.id !== "string") {
    throw new Error(`Expected exactly one database user for ${githubLogin}.`);
  }
  const userId = ownerRows[0].id;
  const existingRows = existingRowsSchema.parse(await sql`
    select source_key, content_hash
    from archive_documents
    where user_id = ${userId} and source = ${TIMBENNIKS_ARCHIVE_SOURCE}
  `);
  const plan = planArchiveDocumentImport(
    existingRows.map((row) => ({
      sourceKey: row.source_key,
      contentHash: row.content_hash,
    })),
    documents,
  );
  const importedAt = new Date().toISOString();
  const documentRows = documents.map((document) => ({
    id: randomUUID(),
    user_id: userId,
    source_key: document.sourceKey,
    title: document.title,
    url: document.url,
    published_at: document.publishedAt,
    body_text: document.bodyText,
    source_markup: document.sourceMarkup,
    tags: document.tags,
    source: document.source,
    destination: document.destination,
    content_hash: document.contentHash,
    metadata: document.metadata,
    created_at: importedAt,
    updated_at: importedAt,
  }));
  const importedSourceKeys = documents.map((document) => document.sourceKey);

  await sql.transaction([
    sql`
      delete from archive_documents
      where user_id = ${userId}
        and source = ${TIMBENNIKS_ARCHIVE_SOURCE}
        and source_key not in (
          select jsonb_array_elements_text(${JSON.stringify(importedSourceKeys)}::jsonb)
        )
    `,
    sql`
      insert into archive_documents (
        id, user_id, source_key, title, url, published_at, body_text,
        source_markup, tags, source, destination, content_hash, metadata,
        created_at, updated_at
      )
      select id, user_id, source_key, title, url, published_at, body_text,
        source_markup, tags, source, destination, content_hash, metadata,
        created_at, updated_at
      from jsonb_to_recordset(${JSON.stringify(documentRows)}::jsonb) as imported(
        id uuid, user_id uuid, source_key text, title text, url text,
        published_at timestamptz, body_text text, source_markup text, tags jsonb,
        source text, destination text, content_hash text, metadata jsonb,
        created_at timestamptz, updated_at timestamptz
      )
      on conflict (user_id, source, source_key) do update set
        title = excluded.title,
        url = excluded.url,
        published_at = excluded.published_at,
        body_text = excluded.body_text,
        source_markup = excluded.source_markup,
        tags = excluded.tags,
        destination = excluded.destination,
        content_hash = excluded.content_hash,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
      where archive_documents.content_hash is distinct from excluded.content_hash
    `,
  ]);

  console.log(
    JSON.stringify(
      {
        mode: "written",
        owner: githubLogin,
        ...baseSummary,
        inserted: plan.inserted.length,
        updated: plan.updated.length,
        unchanged: plan.unchanged.length,
        removed: plan.removed.length,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Archive import failed.");
    process.exitCode = 1;
  });
}
