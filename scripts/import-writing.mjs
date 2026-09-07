import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { neon } from "@neondatabase/serverless";
import { fromMarkdown } from "mdast-util-from-markdown";
import { parse as parseYaml } from "yaml";

const IMPORT_LABEL = "Imported from timbenniks/timbenniks-2026";

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

function titleKey(title) {
  return title.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function sourceFileSlug(fileName, frontmatterSlug) {
  const fromFile = fileName.replace(/\.md$/i, "");
  const raw = typeof frontmatterSlug === "string" && frontmatterSlug.trim()
    ? frontmatterSlug.trim()
    : fromFile;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw)) {
    throw new Error(`${fileName} has an invalid slug.`);
  }
  return raw;
}

export function heroImageFromSource(image, title) {
  if (typeof image !== "string" || !image.trim()) return null;
  try {
    const url = new URL(image.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const alt = String(title).trim().slice(0, 300);
    return alt ? { url: url.toString(), alt } : null;
  } catch {
    return null;
  }
}

function articleMetadata(heroImage, current = { version: 1 }) {
  const metadata = { ...current, version: 1 };
  if (heroImage) metadata.heroImage = heroImage;
  else delete metadata.heroImage;
  return metadata;
}

function sameTags(left = [], right = []) {
  return left.length === right.length
    && left.every((tag, index) => tag.normalizedName === right[index]?.normalizedName);
}

function describeSourceChanges(article, source, nextSlug) {
  const changes = [];
  if (article.slug !== nextSlug) changes.push("slug");
  if (article.title !== source.title) changes.push("title");
  if (article.status !== source.status) changes.push("status");
  if ((article.plainText ?? "").trim() !== source.plainText.trim()) changes.push("body");
  if (!sameTags(article.tags, source.tags)) changes.push("tags");
  const publishedAt = article.publishedAt ? new Date(article.publishedAt).toISOString() : null;
  if (publishedAt !== source.publishedAt) changes.push("published_at");
  if ((article.metadata?.heroImage?.url ?? null) !== (source.heroImage?.url ?? null)) {
    changes.push("hero");
  }
  return changes;
}

export function planWritingReconcile(sources, articles) {
  const articleBySlug = new Map(articles.map((article) => [article.slug, article]));
  const usedSources = new Set();
  const usedArticles = new Set();
  const updates = [];
  const remaps = [];

  for (const source of sources) {
    const article = articleBySlug.get(source.slug);
    if (!article) continue;
    usedSources.add(source.slug);
    usedArticles.add(article.id);
    const changes = describeSourceChanges(article, source, source.slug);
    if (changes.length) updates.push({ article, source, changes, nextSlug: source.slug });
  }

  const remainingSources = sources.filter((source) => !usedSources.has(source.slug));
  const remainingArticles = articles.filter((article) => !usedArticles.has(article.id));
  const sourcesByTitle = new Map();
  const articlesByTitle = new Map();
  for (const source of remainingSources) {
    const key = titleKey(source.title);
    sourcesByTitle.set(key, [...(sourcesByTitle.get(key) ?? []), source]);
  }
  for (const article of remainingArticles) {
    const key = titleKey(article.title);
    articlesByTitle.set(key, [...(articlesByTitle.get(key) ?? []), article]);
  }

  for (const source of remainingSources) {
    const key = titleKey(source.title);
    const sourceMatches = sourcesByTitle.get(key) ?? [];
    const articleMatches = articlesByTitle.get(key) ?? [];
    if (sourceMatches.length !== 1 || articleMatches.length !== 1) continue;
    const article = articleMatches[0];
    if (usedArticles.has(article.id)) continue;
    usedSources.add(source.slug);
    usedArticles.add(article.id);
    remaps.push({ from: article.slug, to: source.slug });
    updates.push({
      article,
      source,
      changes: describeSourceChanges(article, source, source.slug),
      nextSlug: source.slug,
    });
  }

  return {
    inserts: sources.filter((source) => !usedSources.has(source.slug)),
    updates,
    remaps,
    extras: articles
      .filter((article) => !usedArticles.has(article.id))
      .map((article) => ({
        id: article.id,
        slug: article.slug,
        title: article.title,
        status: article.status,
        revision: article.revision,
      })),
  };
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
    const slug = sourceFileSlug(fileName, frontmatter.slug);
    const title = String(frontmatter.title ?? "").trim();

    if (!title || Number.isNaN(publishedAt.valueOf())) {
      throw new Error(`${fileName} is missing a valid title or date.`);
    }
    if (!Array.isArray(frontmatter.tags)) {
      throw new Error(`${fileName} has no tag list.`);
    }

    const documentJson = markdownToDocument(markdown);
    articles.push({
      id: randomUUID(),
      title,
      slug,
      status: frontmatter.draft === true ? "drafting" : "published",
      documentJson,
      plainText: documentToPlainText(documentJson),
      markdown,
      heroImage: heroImageFromSource(frontmatter.image, title),
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

function sourceSummary(sourceArticles) {
  return {
    sourceArticles: sourceArticles.length,
    published: sourceArticles.filter((article) => article.status === "published").length,
    drafts: sourceArticles.filter((article) => article.status === "drafting").length,
    uniqueTags: new Set(sourceArticles.flatMap((article) => article.tags.map((tag) => tag.normalizedName))).size,
    withHeroImages: sourceArticles.filter((article) => article.heroImage).length,
  };
}

function planSummary(plan) {
  return {
    inserts: plan.inserts.map((article) => article.slug),
    remaps: plan.remaps,
    updates: plan.updates.map((update) => ({
      slug: update.nextSlug,
      from: update.article.slug,
      changes: update.changes,
    })),
    extras: plan.extras,
  };
}

async function loadOwnedArticles(sql, userId) {
  const articleRows = await sql`
    select id, title, slug, status, plain_text, metadata, revision, published_at
    from articles
    where user_id = ${userId}
  `;
  const tagRows = await sql`
    select at.article_id, t.normalized_name, t.label, at.position
    from article_tags at
    join tags t on t.id = at.tag_id
    join articles a on a.id = at.article_id
    where a.user_id = ${userId}
    order by at.article_id, at.position
  `;
  const tagsByArticle = new Map();
  for (const row of tagRows) {
    const tags = tagsByArticle.get(row.article_id) ?? [];
    tags.push({ normalizedName: row.normalized_name, label: row.label });
    tagsByArticle.set(row.article_id, tags);
  }
  return articleRows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    plainText: row.plain_text,
    metadata: row.metadata ?? { version: 1 },
    revision: row.revision,
    publishedAt: row.published_at,
    tags: tagsByArticle.get(row.id) ?? [],
  }));
}

async function ensureOwnerTags(sql, userId, sourceArticles) {
  const needed = new Map();
  for (const article of sourceArticles) {
    for (const tag of article.tags) {
      if (!needed.has(tag.normalizedName)) needed.set(tag.normalizedName, tag);
    }
  }
  const now = new Date().toISOString();
  for (const tag of needed.values()) {
    await sql`
      insert into tags (id, user_id, normalized_name, label, created_at, updated_at)
      values (${randomUUID()}, ${userId}, ${tag.normalizedName}, ${tag.label}, ${now}, ${now})
      on conflict (user_id, normalized_name)
      do update set label = excluded.label, updated_at = excluded.updated_at
    `;
  }
  const rows = await sql`
    select id, normalized_name from tags where user_id = ${userId}
  `;
  return new Map(rows.map((row) => [row.normalized_name, row.id]));
}

async function applyWritingReconcile(sql, userId, plan) {
  const affected = [...plan.inserts, ...plan.updates.map((update) => update.source)];
  const tagIds = await ensureOwnerTags(sql, userId, affected);
  const now = new Date().toISOString();
  const statements = [];

  for (const source of plan.inserts) {
    statements.push(sql`
      insert into articles (
        id, user_id, title, slug, status, document_json, plain_text, metadata,
        revision, published_at, created_at, updated_at
      ) values (
        ${source.id}, ${userId}, ${source.title}, ${source.slug}, ${source.status}::article_status,
        ${JSON.stringify(source.documentJson)}::jsonb, ${source.plainText},
        ${JSON.stringify(articleMetadata(source.heroImage))}::jsonb,
        1, ${source.publishedAt}, ${source.createdAt}, ${now}
      )
    `);
    statements.push(sql`
      insert into article_versions (
        id, article_id, article_revision, title, document_json, plain_text,
        markdown, reason, label, created_at
      ) values (
        ${randomUUID()}, ${source.id}, 1, ${source.title},
        ${JSON.stringify(source.documentJson)}::jsonb, ${source.plainText},
        ${source.markdown}, 'import', ${IMPORT_LABEL}, ${now}
      )
    `);
    for (const [position, tag] of source.tags.entries()) {
      statements.push(sql`
        insert into article_tags (article_id, tag_id, position)
        values (${source.id}, ${tagIds.get(tag.normalizedName)}, ${position})
      `);
    }
  }

  for (const update of plan.updates) {
    const nextRevision = update.article.revision + 1;
    const snapshotBody = update.changes.includes("body") || update.changes.includes("title");
    statements.push(snapshotBody
      ? sql`
        update articles set
          title = ${update.source.title},
          slug = ${update.nextSlug},
          status = ${update.source.status}::article_status,
          document_json = ${JSON.stringify(update.source.documentJson)}::jsonb,
          plain_text = ${update.source.plainText},
          metadata = ${JSON.stringify(articleMetadata(update.source.heroImage, update.article.metadata))}::jsonb,
          revision = ${nextRevision},
          published_at = ${update.source.publishedAt},
          updated_at = ${now}
        where id = ${update.article.id} and user_id = ${userId}
      `
      : sql`
        update articles set
          title = ${update.source.title},
          slug = ${update.nextSlug},
          status = ${update.source.status}::article_status,
          metadata = ${JSON.stringify(articleMetadata(update.source.heroImage, update.article.metadata))}::jsonb,
          revision = ${nextRevision},
          published_at = ${update.source.publishedAt},
          updated_at = ${now}
        where id = ${update.article.id} and user_id = ${userId}
      `);
    if (snapshotBody) {
      statements.push(sql`
        insert into article_versions (
          id, article_id, article_revision, title, document_json, plain_text,
          markdown, reason, label, created_at
        ) values (
          ${randomUUID()}, ${update.article.id}, ${nextRevision}, ${update.source.title},
          ${JSON.stringify(update.source.documentJson)}::jsonb, ${update.source.plainText},
          ${update.source.markdown}, 'import', ${IMPORT_LABEL}, ${now}
        )
      `);
    }
    if (update.changes.includes("tags")) {
      statements.push(sql`delete from article_tags where article_id = ${update.article.id}`);
      for (const [position, tag] of update.source.tags.entries()) {
        statements.push(sql`
          insert into article_tags (article_id, tag_id, position)
          values (${update.article.id}, ${tagIds.get(tag.normalizedName)}, ${position})
        `);
      }
    }
  }

  if (statements.length) await sql.transaction(statements);
}

async function replaceOwnedWriting(sql, userId, sourceArticles) {
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
    metadata: articleMetadata(article.heroImage),
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
}

async function main() {
const githubLogin = process.env.ALLOWED_GITHUB_LOGIN;
const sourceArgument = process.argv.find((argument) => argument.startsWith("--source="));
const shouldReplace = process.argv.includes("--replace");
const shouldWrite = process.argv.includes("--write");
const sourceDirectory = sourceArgument?.slice("--source=".length);

if (!sourceDirectory) {
  throw new Error("Pass the source directory with --source=/path/to/src/content/writing.");
}

if (!githubLogin) {
  throw new Error("ALLOWED_GITHUB_LOGIN is required to select the import owner.");
}

if (shouldReplace && shouldWrite) {
  throw new Error("Use either --write (reconcile) or --replace (destructive), not both.");
}

const sourceArticles = await readSourceArticles(sourceDirectory);
if (sourceArticles.length === 0) {
  throw new Error("Refusing to import article data from an empty source directory.");
}
const summary = sourceSummary(sourceArticles);

if (!shouldReplace && !shouldWrite) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log(JSON.stringify({ mode: "source-only", ...summary }, null, 2));
    process.exit(0);
  }
  const sql = neon(databaseUrl);
  const ownerRows = await sql`
    select id from users where lower(github_login) = lower(${githubLogin}) limit 2
  `;
  if (ownerRows.length !== 1) {
    throw new Error(`Expected exactly one database user for ${githubLogin}.`);
  }
  const plan = planWritingReconcile(sourceArticles, await loadOwnedArticles(sql, ownerRows[0].id));
  console.log(JSON.stringify({ mode: "reconcile-dry-run", owner: githubLogin, ...summary, ...planSummary(plan) }, null, 2));
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
if (!databaseUrl) throw new Error("DATABASE_URL_UNPOOLED is required for writing imports.");
const sql = neon(databaseUrl);
const ownerRows = await sql`
  select id from users where lower(github_login) = lower(${githubLogin}) limit 2
`;
if (ownerRows.length !== 1) {
  throw new Error(`Expected exactly one database user for ${githubLogin}.`);
}
const userId = ownerRows[0].id;

if (shouldWrite) {
  const plan = planWritingReconcile(sourceArticles, await loadOwnedArticles(sql, userId));
  await applyWritingReconcile(sql, userId, plan);
  console.log(JSON.stringify({ mode: "reconciled", owner: githubLogin, ...summary, ...planSummary(plan) }, null, 2));
  return;
}

await replaceOwnedWriting(sql, userId, sourceArticles);
console.log(JSON.stringify({ mode: "replaced", owner: githubLogin, ...summary }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
