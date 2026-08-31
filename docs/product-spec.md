# Turbo Timmy Writer product specification

This document is the implementation-facing product specification for Turbo Timmy Writer. It distills the original source specification in [`docs/spec.md`](./spec.md). If the two documents conflict, update both and record the decision in `PROJECT_STATE.md`.

## Product intent

Turbo Timmy Writer is Tim Benniks' personal, cross-platform writing environment. It combines AI-assisted ideation, a focused manual editor, precise reviewable AI edits, writing memory, destination-specific variants, and publishing.

The product is a writing IDE, not a CMS and not an automatic blog generator:

> Conversation creates intent. The brief preserves intent. The editor creates the article. AI assists precisely. Variants adapt it. Publishers ship it. The archive informs the next piece.

## Product principles

### Tim remains the author

AI can be active during ideation and first-draft creation, then should become quieter while Tim edits. AI must never silently alter existing prose. Every edit to existing text is a suggestion or diff that Tim accepts or rejects.

### One canonical article

An article has one canonical Tiptap document. Website, LinkedIn, newsletter, Contentstack Developers, and future outputs are derived variants. Variants remain editable. Regeneration must preserve manual work through explicit confirmation and a version snapshot.

### Archive and voice are different kinds of memory

Archive retrieval answers what Tim has written or thought before. The voice profile describes observed stylistic tendencies. These concerns use separate storage and context layers. AI retrieves relevant archive excerpts instead of adding the complete archive to a prompt.

### Voice is evidence, not a template

Observed tendencies include direct openings, conversational phrasing, technical specificity, first-person experience, qualified strong claims, varied rhythm, and dry humour. They are not mandatory structures. The system must not enforce a fixed interview length, fixed section sequence, recurring phrase, or conclusion heading.

### Derived mechanics belong in code

Slugging, reading time, canonical URLs, Markdown serialization, YAML escaping, metadata duplication, field validation, and stale-variant calculation are deterministic code with focused tests. Prompts do not implement them.

## Initial user and access model

The first release is a single-user application authenticated through GitHub OAuth. Only the configured login may enter:

```env
ALLOWED_GITHUB_LOGIN=timbenniks
```

The data model includes user ownership so multi-user support can be added later. Multi-user product features are out of scope. Secrets and integration credentials remain server-side.

## Information architecture

Primary navigation contains Library, Drafts, Ideas, Published, Archive, Search, and Settings. Opening an article enters a desktop-first writing workspace with navigation on the left, a dominant editor in the centre, and a fully collapsible assistant on the right.

The UI should feel calm, keyboard-friendly, and content-first. It must not resemble a grid of CMS widgets.

## Article lifecycle and content

Article states are `idea`, `interviewing`, `drafting`, `editing`, `ready`, `published`, and `archived`.

An article contains a title, slug, status, canonical document, plain-text projection, metadata, current brief, dates, optional hero image, and tags. Tiptap JSON in Postgres JSONB is the canonical editable representation. Plain text supports search and previews. Markdown is derived for export and publishing.

State changes are validated in domain code. Publication and archive transitions preserve history.

## Starting an article

The default new-article flow begins with a premise, not an empty editor. Tim can still choose a blank document.

The guided flow has four parts:

1. Save the premise immediately.
2. Conduct a streamed interview that asks one useful question at a time.
3. Maintain a visible, editable, revisioned working brief.
4. Create a complete draft on request and snapshot it as `Initial AI draft`.

The interview dynamically decides whether enough context exists. Tim can say "Enough. Draft it." at any point. It can explore the trigger, experience, evidence, examples, disagreement, uncertainty, counterarguments, reader, and intended takeaway without treating that list as a questionnaire.

The brief contains:

```ts
type ArticleBrief = {
  premise: string;
  thesis?: string;
  audience?: string[];
  supportingPoints: string[];
  evidence: string[];
  examples: string[];
  personalExperience: string[];
  counterArguments: string[];
  uncertainties: string[];
  desiredTakeaway?: string;
  possibleAngles: string[];
  thingsToAvoid: string[];
};
```

## Manual editor

The focused Tiptap editor initially supports paragraphs, H2, H3, bold, italic, inline code, code blocks, blockquotes, ordered and unordered lists, links, horizontal rules, and images. It deliberately excludes arbitrary font sizes, colours, and Word-like formatting.

The writing core includes autosave, local recovery, save-state feedback, word count, reading time, keyboard shortcuts, a selection toolbar, focus mode, and optional Markdown preview/export. A browser refresh or crash must not casually lose unsaved writing.

Autosave first writes a local recovery copy, then debounces a server save. Save state is visible as `Saving...`, `Saved`, or `Offline changes`.

## Version history

Versions represent meaningful events rather than keystrokes. Events include an initial AI draft, a manual checkpoint, a snapshot before a large AI replacement, a snapshot before variant regeneration, publication, restore, and an explicit user snapshot.

Each version stores Tiptap JSON, plain text, optionally derived Markdown, timestamp, reason, and an optional AI run reference. Restore and rich comparison can mature in later phases.

## Themes

Themes change the writing environment, never article content. A theme controls typography, editor width, colours, density, and sidebar treatment through validated settings and CSS variables. Ship several starters such as Quiet, Paper, Night, Terminal, and Manuscript. Tim can duplicate, edit, save, delete custom themes, set a default, favourite themes, and switch instantly.

## AI runtime

AI work is split into composable skills rather than one giant chat prompt. Context layers are assembled per task:

```text
global editorial principles
+ voice profile
+ task skill
+ destination rules when needed
+ retrieved writing when needed
+ current document context
```

Every skill requests only the context it needs. Model names are configured centrally with environment variables for interview, draft, edit, review, and embeddings. Use structured output for briefs, findings, reviews, metadata, and retrieval decisions. Use streamed text when drafting prose.

Initial skills are:

- Interview: understand an argument, update the brief, ask one question at a time, and identify missing evidence.
- Draft: create a useful complete draft from the brief, interview, selected archive evidence, and voice guidance.
- Editor: transform a selection with commands or a free-form instruction.
- Humanizer: detect generated-writing patterns first and attach findings to passages; rewriting is separately approved.
- Critic: review claims, repetition, transitions, contradictions, abstraction, generated prose, opening, ending, and evidence without editing.
- Repurpose: produce a destination-specific variant from a canonical version and destination profile.

AI runs record skill and prompt versions, model, token usage, latency, outcome, and structured-output parse failures. Keys and credentials are never logged. Paid model calls are mocked in CI.

## Precision AI editing

Selecting text opens actions such as Tighten, Clarify, Humanize, Make sharper, Fix rhythm, Alternative, and a free-form Ask AI command. The result becomes a pending suggestion containing the original text, suggested text, instruction, optional source version, timestamps, and accept/reject state.

Accepting a suggestion applies it to the current document. Rejecting it leaves the document unchanged. Suggestion outcomes feed AI observability.

## Writing memory

After the editor and guided start are stable, import existing published writing into archive documents and replaceable chunks of roughly 500 to 1000 tokens with small overlap. Preserve title, URL, publication date, body, tags, source, and destination.

Support literal Postgres full-text search, semantic pgvector search, and hybrid search through one server-side interface. Surface related writing during article creation and provide `Have I written this before?` inside the editor. The complete archive is never placed in a prompt by default.

The voice profile is seeded from the writing-voice repository and later refreshed by analysing published work. It stores observations and evidence, not absolute prose rules, and can flag both stylistic matches and overused personal patterns.

## Variants

Variants are derived documents for website, LinkedIn post, LinkedIn article, newsletter, and later destinations. Each stores destination, content, metadata, source article version, dates, and publication state.

When the canonical article changes, existing variants are marked stale but not regenerated. Tim chooses to review changes, regenerate, or keep the current version. Regeneration of edited content requires a pre-regeneration version and explicit confirmation.

LinkedIn V1 provides generation, formatting preview, clipboard copy, manual publication tracking, and a manually entered URL. Newsletter V1 stores subject, preview text, body, optional intro, and optional call to action without choosing a provider.

## Publishing

Publishers implement typed adapters for validation, transformation, preview, publish, and optional update. Destination fields stay out of the core article schema; destination-specific metadata lives in typed extension data.

The first live publisher targets timbenniks.dev. It generates validated Markdown and YAML frontmatter, previews both, and uses the GitHub API from the deployed application to create or update a configured repository path. It stores commit SHA and canonical URL. The application never shells out to `gh` in production and does not trigger redundant Vercel deployments.

Publication always requires user confirmation. Autonomous publishing is out of scope.

## Assets

V1 supports external hero and inline image URLs with alt text, caption, and credit. The asset schema allows a future Cloudinary adapter, but a custom digital asset manager is out of scope.

## Technology

- Next.js App Router and TypeScript
- Tailwind CSS and shadcn/ui primitives
- Tiptap
- Drizzle ORM with Neon Postgres and pgvector
- Vercel AI SDK and OpenAI API
- GitHub API and Vercel
- Zod
- pnpm
- Vitest, Playwright, and GitHub Actions

Use server components by default and client components only for browser interaction. Validate boundaries with Zod, avoid `any`, and keep clear domains for AI skills, publishing, editor serialization, retrieval, and database access.

## Testing and quality

Unit-test deterministic domain behavior, especially slugging, reading time, frontmatter, serialization, publisher validation, theme validation, article transitions, stale variants, and retrieval helpers.

Integration-test database operations, AI structured-output parsing, and the mocked GitHub publisher. Playwright covers critical flows as they arrive: authentication, creation, autosave/reload, guided start, draft generation, precise suggestions, and publication preview.

Every coherent slice must pass relevant tests, typecheck, and production build. CI never calls paid OpenAI APIs.

## Cost and safety constraints

- Retrieve only task-relevant context.
- Cache embeddings and re-embed only changed content.
- Do not run expensive reviews after each edit.
- Humanizer and critic are explicit actions.
- Keep integration secrets server-side.
- Preserve existing prose, variants, and versions unless Tim explicitly approves a change.
- Never destroy manual variant edits through automatic regeneration.

## Delivery phases

The delivery order is Foundation, Writing core, AI-assisted start, Precision AI, Writing memory, Variants, Website publishing, and Polish. Each phase has its own document under `docs/phases/`, acceptance criteria, tests, and validation checkpoint. Later-phase features do not move earlier unless they are required to meet an earlier acceptance criterion.

## Initially out of scope

Multi-user collaboration, real-time cursors, inter-user comments, teams, billing, public SaaS onboarding, workflow engines, arbitrary CMS support, native applications, a custom DAM, custom Git implementation, autonomous publishing, and destructive automatic variant regeneration are out of scope.
