import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { neon } from "@neondatabase/serverless";
import { fromMarkdown } from "mdast-util-from-markdown";
import { parse as parseYaml } from "yaml";

const IMPORT_LABEL = "Imported from timbenniks/timbenniksdev-2024";

function sourceSlice(source, node) {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return typeof start === "number" && typeof end === "number"
    ? source.slice(start, end)
    : "";
}

function textNode(text, marks) {
  return marks?.length ? { type: "text", text, marks } : { type: "text", text };
}

function safeLinkHref(value) {
  if (value.startsWith("/") || value.startsWith("#")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
}

function inlineNodes(node, source, marks = []) {
  switch (node.type) {
    case "text":
      return node.value ? [textNode(node.value, marks)] : [];
    case "inlineCode":
      return node.value ? [textNode(node.value, [...marks, { type: "code" }])] : [];
    case "strong":
      return node.children.flatMap((child) =>
        inlineNodes(child, source, [...marks, { type: "bold" }]),
      );
    case "emphasis":
      return node.children.flatMap((child) =>
        inlineNodes(child, source, [...marks, { type: "italic" }]),
      );
    case "link": {
      const href = safeLinkHref(node.url);
      if (!href) {
        return node.children.flatMap((child) => inlineNodes(child, source, marks));
      }
      const linkMark = {
        type: "link",
        attrs: { href, target: null, rel: null, class: null },
      };
      return node.children.flatMap((child) =>
        inlineNodes(child, source, [...marks, linkMark]),
      );
    }
    case "break":
      return [textNode("\n", marks)];
    case "image":
      return [textNode(sourceSlice(source, node), marks)];
    case "html":
      return node.value ? [textNode(node.value, marks)] : [];
    default:
      if (Array.isArray(node.children)) {
        return node.children.flatMap((child) => inlineNodes(child, source, marks));
      }
      return sourceSlice(source, node)
        ? [textNode(sourceSlice(source, node), marks)]
        : [];
  }
}

function paragraphFromSource(node, source) {
  const value = sourceSlice(source, node);
  return {
    type: "paragraph",
    content: value ? [textNode(value)] : [],
  };
}

function listItemNode(node, source) {
  const nestedLists = [];
  const paragraphParts = [];

  for (const child of node.children) {
    if (child.type === "list") {
      nestedLists.push(listNode(child, source));
      continue;
    }

    if (child.type === "paragraph") {
      if (paragraphParts.length > 0) paragraphParts.push(textNode("\n"));
      paragraphParts.push(...child.children.flatMap((item) => inlineNodes(item, source)));
      continue;
    }

    const value = sourceSlice(source, child);
    if (value) {
      if (paragraphParts.length > 0) paragraphParts.push(textNode("\n"));
      paragraphParts.push(textNode(value));
    }
  }

  return {
    type: "listItem",
    content: [{ type: "paragraph", content: paragraphParts }, ...nestedLists],
  };
}

function listNode(node, source) {
  return {
    type: node.ordered ? "orderedList" : "bulletList",
    ...(node.ordered ? { attrs: { start: node.start ?? 1 } } : {}),
    content: node.children.map((child) => listItemNode(child, source)),
  };
}

function safeImageSource(value) {
  try {
    const url = new URL(value, "https://timbenniks.dev");
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function blockNodes(node, source) {
  switch (node.type) {
    case "paragraph": {
      if (node.children.length === 1 && node.children[0]?.type === "image") {
        const image = node.children[0];
        const src = safeImageSource(image.url);
        if (src) {
          return [{
            type: "image",
            attrs: {
              src,
              alt: image.alt ?? null,
              title: image.title ?? null,
              width: null,
              height: null,
            },
          }];
        }
      }
      return [{
        type: "paragraph",
        content: node.children.flatMap((child) => inlineNodes(child, source)),
      }];
    }
    case "heading":
      return [{
        type: "heading",
        attrs: { level: node.depth <= 2 ? 2 : 3 },
        content: node.children.flatMap((child) => inlineNodes(child, source)),
      }];
    case "blockquote": {
      const content = node.children.flatMap((child) => blockNodes(child, source));
      return content.length > 0 ? [{ type: "blockquote", content }] : [];
    }
    case "list":
      return [listNode(node, source)];
    case "code":
      {
        const language = node.lang?.slice(0, 40) ?? null;
      return [{
        type: "codeBlock",
        attrs: {
          language:
            language === null || /^[A-Za-z0-9_+#.-]{0,40}$/.test(language)
              ? language
              : null,
        },
        content: node.value ? [textNode(node.value)] : [],
      }];
      }
    case "thematicBreak":
      return [{ type: "horizontalRule" }];
    case "html":
      return node.value ? [{ type: "paragraph", content: [textNode(node.value)] }] : [];
    default:
      return [paragraphFromSource(node, source)];
  }
}

export function markdownToDocument(markdown) {
  const tree = fromMarkdown(markdown);
  const content = tree.children.flatMap((node) => blockNodes(node, markdown));
  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}

function inlineText(node) {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(inlineText).join("");
}

function blockText(node) {
  if (["paragraph", "heading", "codeBlock"].includes(node.type)) return inlineText(node);
  if (node.type === "image") return typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
  if (node.type === "horizontalRule") return "";
  const separator = node.type === "blockquote" ? "\n\n" : "\n";
  return (node.content ?? []).map(blockText).filter(Boolean).join(separator);
}

export function documentToPlainText(document) {
  return document.content.map(blockText).filter(Boolean).join("\n\n").trim();
}

function normalizeTag(value) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export async function readSourceArticles(directory) {
  const fileNames = (await readdir(directory))
    .filter((fileName) => fileName.endsWith(".md") && fileName !== "index.md")
    .sort();
  const articles = [];

  for (const fileName of fileNames) {
    const source = await readFile(path.join(directory, fileName), "utf8");
    const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (!match) throw new Error(`${fileName} has no YAML frontmatter.`);
    const frontmatter = parseYaml(match[1]);
    const markdown = source.slice(match[0].length).trim();
    const publishedAt = new Date(frontmatter.date);

    if (!frontmatter.title || !frontmatter.slug || Number.isNaN(publishedAt.valueOf())) {
      throw new Error(`${fileName} is missing a valid title, slug, or date.`);
    }
    if (!Array.isArray(frontmatter.tags)) {
      throw new Error(`${fileName} has no tag list.`);
    }

    const documentJson = markdownToDocument(markdown);
    articles.push({
      id: randomUUID(),
      title: String(frontmatter.title),
      slug: String(frontmatter.slug),
      status: frontmatter.draft === true ? "drafting" : "published",
      documentJson,
      plainText: documentToPlainText(documentJson),
      markdown,
      tags: [...new Map(frontmatter.tags.map((tag) => {
        const label = String(tag).normalize("NFKC").trim().replace(/\s+/g, " ");
        return [normalizeTag(label), label];
      })).entries()].map(([normalizedName, label]) => ({ normalizedName, label })),
      publishedAt: frontmatter.draft === true ? null : publishedAt.toISOString(),
      createdAt: publishedAt.toISOString(),
      updatedAt: publishedAt.toISOString(),
    });
  }

  const slugs = new Set(articles.map((article) => article.slug));
  if (slugs.size !== articles.length) throw new Error("Source slugs are not unique.");
  return articles;
}

async function main() {
const githubLogin = process.env.ALLOWED_GITHUB_LOGIN;
const sourceArgument = process.argv.find((argument) => argument.startsWith("--source="));
const shouldReplace = process.argv.includes("--replace");
const sourceDirectory = sourceArgument?.slice("--source=".length);

if (!sourceDirectory) {
  throw new Error("Pass the source directory with --source=/path/to/content/4.writing.");
}

if (!githubLogin) {
  throw new Error("ALLOWED_GITHUB_LOGIN is required to select the import owner.");
}

const sourceArticles = await readSourceArticles(sourceDirectory);
if (sourceArticles.length === 0) {
  throw new Error("Refusing to replace article data from an empty source directory.");
}
const summary = {
  sourceArticles: sourceArticles.length,
  published: sourceArticles.filter((article) => article.status === "published").length,
  drafts: sourceArticles.filter((article) => article.status === "drafting").length,
  uniqueTags: new Set(sourceArticles.flatMap((article) => article.tags.map((tag) => tag.normalizedName))).size,
};

if (!shouldReplace) {
  console.log(JSON.stringify({ mode: "dry-run", ...summary }, null, 2));
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
if (!databaseUrl) throw new Error("DATABASE_URL_UNPOOLED is required for replacement imports.");
const sql = neon(databaseUrl);
const ownerRows = await sql`
  select id from users where lower(github_login) = lower(${githubLogin}) limit 2
`;
if (ownerRows.length !== 1) {
  throw new Error(`Expected exactly one database user for ${githubLogin}.`);
}
const userId = ownerRows[0].id;
const tagMap = new Map();
for (const article of sourceArticles) {
  for (const tag of article.tags) {
    if (!tagMap.has(tag.normalizedName)) {
      tagMap.set(tag.normalizedName, { id: randomUUID(), ...tag });
    }
  }
}
const now = new Date().toISOString();
const articleRows = sourceArticles.map((article) => ({
  id: article.id,
  user_id: userId,
  title: article.title,
  slug: article.slug,
  status: article.status,
  document_json: article.documentJson,
  plain_text: article.plainText,
  metadata: { version: 1 },
  revision: 1,
  published_at: article.publishedAt,
  created_at: article.createdAt,
  updated_at: article.updatedAt,
}));
const tagRows = [...tagMap.values()].map((tag) => ({
  id: tag.id,
  user_id: userId,
  normalized_name: tag.normalizedName,
  label: tag.label,
  created_at: now,
  updated_at: now,
}));
const assignmentRows = sourceArticles.flatMap((article) =>
  article.tags.map((tag, position) => ({
    article_id: article.id,
    tag_id: tagMap.get(tag.normalizedName).id,
    position,
  })),
);
const versionRows = sourceArticles.map((article) => ({
  id: randomUUID(),
  article_id: article.id,
  article_revision: 1,
  title: article.title,
  document_json: article.documentJson,
  plain_text: article.plainText,
  markdown: article.markdown,
  reason: "import",
  label: IMPORT_LABEL,
  created_at: now,
}));

await sql.transaction([
  sql`delete from article_tags using articles where article_tags.article_id = articles.id and articles.user_id = ${userId}`,
  sql`delete from article_versions using articles where article_versions.article_id = articles.id and articles.user_id = ${userId}`,
  sql`delete from articles where user_id = ${userId}`,
  sql`delete from tags where user_id = ${userId}`,
  sql`
    insert into articles (id, user_id, title, slug, status, document_json, plain_text, metadata, revision, published_at, created_at, updated_at)
    select id, user_id, title, slug, status::article_status, document_json, plain_text, metadata, revision, published_at, created_at, updated_at
    from jsonb_to_recordset(${JSON.stringify(articleRows)}::jsonb) as imported(
      id uuid, user_id uuid, title text, slug text, status text, document_json jsonb,
      plain_text text, metadata jsonb, revision integer, published_at timestamptz,
      created_at timestamptz, updated_at timestamptz
    )
  `,
  sql`
    insert into tags (id, user_id, normalized_name, label, created_at, updated_at)
    select id, user_id, normalized_name, label, created_at, updated_at
    from jsonb_to_recordset(${JSON.stringify(tagRows)}::jsonb) as imported(
      id uuid, user_id uuid, normalized_name text, label text,
      created_at timestamptz, updated_at timestamptz
    )
  `,
  sql`
    insert into article_tags (article_id, tag_id, position)
    select article_id, tag_id, position
    from jsonb_to_recordset(${JSON.stringify(assignmentRows)}::jsonb) as imported(
      article_id uuid, tag_id uuid, position integer
    )
  `,
  sql`
    insert into article_versions (id, article_id, article_revision, title, document_json, plain_text, markdown, reason, label, created_at)
    select id, article_id, article_revision, title, document_json, plain_text, markdown, reason, label, created_at
    from jsonb_to_recordset(${JSON.stringify(versionRows)}::jsonb) as imported(
      id uuid, article_id uuid, article_revision integer, title text,
      document_json jsonb, plain_text text, markdown text, reason text,
      label text, created_at timestamptz
    )
  `,
]);

console.log(JSON.stringify({ mode: "replaced", owner: githubLogin, ...summary }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
