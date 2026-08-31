# AI-assisted writing studio

Build a personal, cross-platform writing environment for Tim Benniks.

The product combines:

- AI-assisted ideation and drafting
- a high-quality manual writing experience
- precise AI editing
- a searchable archive of all previous writing
- voice-aware AI assistance
- destination-specific variants
- publishing to multiple destinations
- configurable writing themes
- version history and safe AI suggestions

This is not an "AI writes blog posts" product.

The mental model is:

> Conversation creates intent.
> The brief preserves intent.
> The editor creates the article.
> AI assists precisely.
> Variants adapt it.
> Publishers ship it.
> The archive informs the next piece.

The app should feel closer to a writing IDE than a CMS.

---

# 1. Core product principles

## Human remains the author

AI assists aggressively during ideation and first-draft creation, but becomes quieter once the user is editing.

AI must never silently modify an existing article.

Changes to existing prose must be presented as suggestions or diffs that can be accepted or rejected.

## One canonical article

Every piece of writing has one canonical document.

Destination-specific versions are variants derived from it:

- timbenniks.dev
- LinkedIn
- newsletter
- Contentstack Developers
- future destinations

Variants can be manually edited after generation.

Regenerating a variant must never silently destroy manual changes.

## Archive as memory

All previous writing should eventually become searchable and available to AI.

AI should retrieve relevant past writing rather than stuffing the entire archive into prompts.

The archive represents both:

1. what Tim sounds like
2. what Tim has already thought and written about

Those are different concerns and should remain separate in the architecture.

## Voice guidance is evidence, not law

Existing articles can reveal tendencies such as:

- direct thesis-first openings
- conversational language
- opinionated framing
- varied sentence rhythm
- technical specificity
- first-person experience
- willingness to qualify strong claims
- dry or self-deprecating humour

Do not turn observed tendencies into mandatory article templates.

Avoid rules such as:

- always ask five questions
- always include a counterargument section
- always use a specific conclusion heading
- always use an inversion argument

That creates a caricature rather than preserving voice.

---

# 2. Technology

Use:

- Next.js, App Router
- TypeScript
- Tailwind CSS
- shadcn/ui primitives
- Tiptap
- Drizzle ORM
- Neon Postgres
- pgvector on Neon
- Vercel AI SDK
- OpenAI API
- GitHub API
- Vercel
- Zod

Recommended supporting tools:

- Vitest for unit tests
- Playwright for critical end-to-end flows
- GitHub Actions for CI

Use `pnpm` unless the existing repository already standardizes on another package manager.

The application must deploy to Vercel.

The user already has:

- `gh`
- `vercel`

Use these CLIs for local repository management, provisioning, environment configuration and deployment.

Do not architect the deployed application around the existence of either CLI.

Production integrations must use APIs, OAuth, webhooks or server-side credentials.

---

# 3. Repository setup

If this is a new repository:

1. Initialize the Next.js application.
2. Create the GitHub repository with `gh`.
3. Connect it to Vercel.
4. Provision Neon.
5. Configure environment variables.
6. Create initial Drizzle migrations.
7. Add CI.

Create these documents before substantial implementation:

```text
docs/
  product-spec.md
  architecture.md
  data-model.md

  phases/
    00-foundation.md
    01-writing-core.md
    02-ai-start.md
    03-precision-ai.md
    04-writing-memory.md
    05-variants.md
    06-publishing.md
    07-polish.md

PROJECT_STATE.md
AGENTS.md
```

`PROJECT_STATE.md` should always contain:

- current phase
- completed work
- known issues
- next tasks
- important architecture decisions

Update it throughout implementation so another Codex session can resume the build.

---

# 4. Authentication

This is initially a single-user personal application.

Use GitHub OAuth.

Allow access only to a configured GitHub username.

Example:

```env
ALLOWED_GITHUB_LOGIN=timbenniks
```

Do not expose secrets to client components.

All OpenAI, GitHub and publishing credentials must remain server-side.

Design the schema so multi-user support is possible later, but do not build multi-user product features now.

---

# 5. Main information architecture

Primary navigation:

```text
Library
Drafts
Ideas
Published
Archive

Search

Settings
```

Opening an article enters the writing workspace.

Desktop workspace:

```text
┌──────────────┬──────────────────────────────┬───────────────────┐
│              │                              │                   │
│ Library      │         Editor               │ Assistant         │
│              │                              │                   │
│ Drafts       │                              │                   │
│ Published    │                              │                   │
│ Ideas        │                              │                   │
│ Archive      │                              │                   │
│              │                              │                   │
└──────────────┴──────────────────────────────┴───────────────────┘
```

The editor is visually dominant.

The assistant panel can collapse completely.

Do not make the app look like a CMS dashboard.

---

# 6. Article lifecycle

Use these conceptual states:

```text
idea
interviewing
drafting
editing
ready
published
archived
```

An article contains:

- title
- slug
- status
- canonical document
- plain text representation
- metadata
- brief
- created date
- updated date
- publication date
- hero image
- tags

The canonical editable representation is Tiptap JSON stored as JSONB.

Markdown is an export format, not the primary database representation.

---

# 7. Starting a new article

Do not start new articles in an empty editor by default.

The default flow is AI-assisted.

## Step 1: premise

Present a simple screen:

```text
What are you thinking about?

[ large text box ]

Start writing with AI
Start with a blank document
```

Example premise:

> Larger MCP tool definitions consume more prompt tokens, but I think richer definitions might reduce overall reasoning and tool use enough to be worth it.

Save the premise immediately.

## Step 2: interview

Start an AI conversation.

The agent's goal is:

> Understand the argument well enough to help Tim write the piece.

The agent asks one useful question at a time.

It should decide dynamically when enough context exists.

Do not enforce a fixed number of questions.

Useful areas to investigate include:

- what triggered the idea
- personal experience
- evidence
- examples
- conventional wisdom
- disagreement
- uncertainty
- counterarguments
- intended reader
- desired takeaway

These are possibilities, not a questionnaire.

The user must also be able to say:

```text
Enough. Draft it.
```

at any time.

## Step 3: working brief

Maintain a structured brief during the conversation.

Suggested schema:

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

The brief should be visible in a collapsible panel.

Allow manual editing.

Persist every revision.

## Step 4: first draft

When enough context exists, offer:

```text
Create first draft
Continue talking
```

The draft agent receives:

- the brief
- interview context
- relevant archive excerpts
- writing voice guidance
- global editorial principles

Generate a complete first draft.

Insert it into Tiptap.

Create a version snapshot named:

```text
Initial AI draft
```

The conversation remains accessible afterward.

---

# 8. AI architecture

Do not create one giant chat prompt.

Build an internal AI task runtime.

Suggested structure:

```text
src/
  ai/
    runtime/
      execute-task.ts
      context.ts
      models.ts
      types.ts

    skills/
      interview/
      draft/
      editor/
      humanize/
      critic/
      repurpose/

    voice/
      profile.ts
      retrieval.ts
      patterns.ts

    tools/
      search-writing.ts
      get-article.ts
      get-related-writing.ts
```

A writing skill is an application concept, not a ChatGPT Skill dependency.

Possible interface:

```ts
interface WritingSkill<TInput, TOutput> {
  id: string;
  name: string;
  description: string;

  buildInstructions(): string;

  inputSchema: ZodSchema<TInput>;
  outputSchema?: ZodSchema<TOutput>;

  resolveContext?: (input: TInput) => Promise<WritingContext>;
}
```

Use composable context layers:

```text
Global editorial principles
        +
Voice profile
        +
Task skill
        +
Destination rules when relevant
        +
Retrieved writing when relevant
        +
Current document context
```

Never send all available context automatically.

Each skill should request only what it needs.

---

# 9. Initial AI skills

Implement these as independent modules.

## Interview

Purpose:

Turn a premise into an understood argument and working brief.

Behavior:

- conversational
- asks one question at a time
- does not write article prose prematurely
- updates the brief
- notices missing evidence
- challenges vague assumptions
- knows when enough context exists

## Draft

Purpose:

Generate a useful first draft from a completed brief.

Inputs:

- brief
- interview
- related past writing
- voice guidance

Output:

- article draft

Avoid rigid article templates.

## Editor

Purpose:

Perform precise transformations on selected text.

Initial commands:

- Tighten
- Clarify
- Simplify
- Rewrite
- Make sharper
- Fix rhythm
- More technical
- Less technical
- Continue
- Alternative phrasing

Also support free-form instructions.

Example:

> This sounds like product marketing. Make it sound like I'm mildly annoyed by the whole thing.

## Humanizer

Purpose:

Detect and reduce generated-writing patterns.

Separate detection from rewriting.

The initial action should be:

```text
AI smell check
```

Return findings attached to specific passages.

Example finding:

```text
Severity: high
Pattern: generic AI vocabulary
Text: "the evolving landscape of..."
Reason: vague phrase with little informational value
Suggestion: ...
```

The user chooses whether to apply a suggestion.

## Critic

Purpose:

Review a document without rewriting it.

Look for:

- unsupported claims
- repeated arguments
- weak transitions
- unnecessary sections
- contradictions
- unclear pronouns
- excessive abstraction
- suspiciously generated prose
- weak opening
- weak ending
- places where more evidence would help

## Repurpose

Purpose:

Create destination-specific variants.

It should use:

- canonical article
- destination rules
- social/newsletter voice guidance
- manually configurable instructions

---

# 10. Reuse useful material from existing voice repo

Inspect:

```text
https://github.com/timbenniks/timbenniks-writing-voice
```

Use `gh` to access it.

Do not make the new application depend on this repository at runtime.

Mine it for useful information.

Important source material includes:

```text
references/editorial-rules.md
references/articles.md
references/social.md
references/blog-structure.md
```

Treat them differently.

## editorial-rules.md

Use this as seed material for:

- humanizer patterns
- critic rules
- editorial principles

Convert useful patterns into structured definitions where practical.

Example:

```ts
type EditorialPattern = {
  id: string;
  name: string;
  description: string;
  examples?: string[];
  severity?: "low" | "medium" | "high";
};
```

## articles.md

Use it as seed material for the voice profile.

Convert absolute language into tendencies.

Example:

Bad:

```text
Always end with "Concluding".
```

Better:

```text
Published articles often end with a short forward-looking
section. Do not force this structure when another ending
fits the argument better.
```

## social.md

Use this as seed material for destination rules.

## blog-structure.md

Do not implement deterministic formatting instructions as AI prompts.

Turn deterministic behavior into code.

Examples:

- slug generation
- canonical URLs
- reading-time calculation
- YAML serialization
- metadata duplication
- field validation

---

# 11. Model configuration

Do not hardcode model names throughout the codebase.

Use environment configuration:

```env
OPENAI_API_KEY=

OPENAI_MODEL_INTERVIEW=
OPENAI_MODEL_DRAFT=
OPENAI_MODEL_EDIT=
OPENAI_MODEL_REVIEW=
OPENAI_MODEL_EMBEDDING=
```

Create sensible defaults in one configuration module.

The application should make it easy to change models later.

Use streaming responses where appropriate.

Use structured outputs for things such as:

- article briefs
- reviews
- humanizer findings
- metadata candidates
- retrieval decisions

Use plain streamed text for article drafting where structured output provides no advantage.

---

# 12. Editor

Build a focused Tiptap editor.

Initial content support:

- paragraph
- heading 2
- heading 3
- bold
- italic
- inline code
- code block
- blockquote
- ordered list
- unordered list
- links
- horizontal rule
- images

Do not build Word-like formatting.

No arbitrary font size, text color or visual formatting inside document content.

Themes control presentation.

Use semantic document structure.

## Editor behavior

Implement:

- autosave
- local recovery
- word count
- reading time
- keyboard shortcuts
- selection toolbar
- slash menu if useful
- focus mode
- optional Markdown preview/export

Autosave should:

1. write a local recovery copy
2. debounce saving to the server
3. visibly indicate save state

Examples:

```text
Saving...
Saved
Offline changes
```

A refresh or browser crash must not casually destroy unsaved text.

---

# 13. Precision AI editing

When text is selected, show a small AI action menu.

Example:

```text
Ask AI
────────────
Tighten
Clarify
Humanize
Make sharper
Fix rhythm
Alternative
```

AI must not immediately replace the selection.

Store a suggestion:

```ts
type AISuggestion = {
  articleId: string;
  versionId?: string;

  originalText: string;
  suggestedText: string;

  instruction: string;

  status: "pending" | "accepted" | "rejected";

  createdAt: Date;
};
```

UI:

```text
original
- AI has fundamentally transformed the way developers build software.

suggested
+ AI changed how developers build software.

[Reject] [Accept]
```

Accepting applies the change to the current document.

Rejecting leaves the document untouched.

---

# 14. Version history

Do not version every keystroke.

Create meaningful snapshots on events such as:

- initial AI draft
- manual checkpoint
- before whole-section AI replacement
- before variant regeneration
- publication
- user-created snapshot

Each version should contain:

- Tiptap JSON
- plain text
- Markdown representation if available
- timestamp
- reason
- optional AI run reference

Provide restore and compare actions later.

---

# 15. Themes

Themes are first-class saved user settings.

A theme changes the writing environment, not document content.

Suggested model:

```ts
type WritingTheme = {
  id: string;
  name: string;

  editor: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    maxWidth: number;
  };

  appearance: {
    background: string;
    foreground: string;
    muted: string;
    accent: string;
    selection: string;
  };

  chrome: {
    density: "compact" | "comfortable";
    sidebar: "visible" | "minimal" | "hidden";
  };
};
```

Ship several starter themes.

For example:

```text
Quiet
Paper
Night
Terminal
Manuscript
```

Names are not important.

Allow:

- duplicate
- modify
- save
- delete custom themes
- set default
- favourite themes
- quickly switch while writing

Use CSS variables where possible.

Theme changes should feel instantaneous.

---

# 16. Data model

Start with approximately these tables.

Names can be adjusted if better domain terminology emerges.

```text
users

articles
article_briefs
article_versions

writing_sessions
writing_messages

ai_runs
ai_suggestions

themes
writing_profiles

publication_variants
publications
publisher_configs

assets

sources
article_sources

archive_documents
archive_chunks

tags
article_tags
```

## articles

Important fields:

```text
id
user_id
title
slug
status
document_json
plain_text
created_at
updated_at
published_at
```

## writing_sessions

Represents the AI conversation around an article.

Types can later include:

```text
article-start
research
revision
```

Initially only implement `article-start`.

## ai_runs

Record enough information to debug AI behavior:

```text
id
article_id
skill
model
input_tokens
output_tokens
duration_ms
status
created_at
```

Do not store secrets.

Where practical, record prompt/version identifiers so AI behavior is reproducible.

---

# 17. Search and writing memory

This comes after the editor and AI workflow are solid.

Support:

1. full-text search
2. semantic search

Import all existing published writing.

Each archive document should retain:

- title
- URL
- publication date
- body
- tags
- source
- publication destination

Chunk articles for embedding.

Keep chunking implementation replaceable.

Initial target:

- roughly 500 to 1000 tokens per chunk
- small overlap
- preserve article metadata

Store embeddings using pgvector.

Expose a server-side tool:

```ts
searchWriting({
  query,
  mode,
  limit,
  excludeArticleId,
});
```

Modes:

```text
semantic
literal
hybrid
```

---

# 18. Archive-aware AI

When beginning a new article, search the archive for related work.

Surface results in the interface:

```text
Related writing

The tool catalog is the product
82% related

MCP profiles changed how I think...
74% related
```

AI should be able to receive selected relevant passages.

Prompt guidance should distinguish:

```text
Use these excerpts to understand Tim's previous thinking.
Do not copy phrases merely to imitate style.
Avoid repeating arguments unless repetition is useful.
Build on previous ideas when possible.
```

Add an editor command:

```text
Have I written this before?
```

It should search for semantically similar passages.

This is a core product feature.

---

# 19. Voice profile

Keep voice separate from archive retrieval.

Initial voice profile can be seeded from the existing writing repo.

Later add a voice-analysis process that periodically analyses published work.

Store observations such as:

- typical sentence length
- sentence length variance
- paragraph length
- first-person frequency
- common vocabulary
- frequent transitions
- rhetorical-question frequency
- humour style
- typical openings
- typical endings
- common argument structures
- overused personal patterns

The system should eventually detect overuse.

Example:

```text
"The uncomfortable truth"

This phrase matches your voice, but you have used
this construction frequently in previous articles.

Consider varying it.
```

That distinction matters:

```text
sounds like Tim
```

does not automatically mean:

```text
Tim should keep saying it.
```

---

# 20. Variant model

Variants are derived documents.

Example:

```text
Article
  ├── Website
  ├── LinkedIn post
  ├── LinkedIn article
  ├── Newsletter
  └── Contentstack Developers
```

Each variant stores:

```text
destination
content
metadata
generated_from_version
created_at
updated_at
publication status
```

If the canonical article changes after variant creation, show:

```text
Canonical article changed since this variant was created.
```

Do not automatically regenerate it.

Provide:

```text
Review changes
Regenerate
Keep current version
```

---

# 21. Publisher interface

Define publishing as adapters.

Example:

```ts
interface PublisherAdapter<TConfig, TPayload, TResult> {
  id: string;

  validate(
    article: Article,
    variant: PublicationVariant,
  ): Promise<ValidationResult>;

  transform(article: Article, variant: PublicationVariant): Promise<TPayload>;

  preview(payload: TPayload): Promise<PublisherPreview>;

  publish(config: TConfig, payload: TPayload): Promise<TResult>;

  update?(
    config: TConfig,
    existing: Publication,
    payload: TPayload,
  ): Promise<TResult>;
}
```

Destination code must not leak into the core editor.

---

# 22. timbenniks.dev publisher

This should be the first real publisher.

The existing voice repository contains the blog frontmatter specification.

Implement those deterministic rules in code.

Website output should produce:

```text
---
frontmatter
---

Markdown article body
```

Features:

- preview generated Markdown
- preview frontmatter
- validate required metadata
- create/update file in GitHub
- retain commit SHA
- retain canonical URL

Use the GitHub API from the deployed application.

Do not shell out to `gh` inside Vercel.

For V1, support one configured repository and path template.

Example configuration:

```ts
{
  owner: "timbenniks",
  repo: "...",
  branch: "main",
  pathTemplate: "content/writing/{slug}.md"
}
```

Make this configurable rather than hardcoding the final path.

Publishing flow:

```text
Canonical article
      ↓
Website variant
      ↓
Frontmatter generator
      ↓
Markdown serializer
      ↓
Preview
      ↓
Commit to GitHub
      ↓
Website deploy
```

Do not trigger a separate Vercel deployment if the repository's Vercel integration already deploys automatically.

---

# 23. LinkedIn

Initial implementation:

- generate LinkedIn post
- generate long-form LinkedIn-ready article
- preview formatting
- copy to clipboard
- track whether it has been manually published
- save published URL manually

Do not block the project on LinkedIn API permissions.

If reliable supported API publishing is available later, implement it as a publisher adapter.

---

# 24. Newsletter

Do not choose a newsletter provider yet.

Implement:

```text
Newsletter variant
```

with fields such as:

- subject
- preview text
- body
- optional intro
- optional CTA

Make provider integration a later adapter.

---

# 25. Contentstack Developers

Treat this as a future publisher adapter.

Do not mix Contentstack-specific fields into the base article schema.

Allow publisher-specific metadata in a JSON field or typed extension schema.

Later implementation can use Contentstack APIs.

---

# 26. Assets

Support:

- hero image
- inline images
- alt text
- caption
- credit
- external URL

Do not build a full DAM in V1.

Use external URLs initially.

Design the asset model so Cloudinary can be added naturally.

---

# 27. Command palette

Add a command palette once core editor behavior works.

Potential commands:

```text
New article
Search writing
Switch theme
Create checkpoint

Ask AI about selection
Tighten selection
Humanize selection
Review article

Generate LinkedIn version
Generate newsletter version
Generate website version

Publish website
```

Keyboard-first use should feel good.

---

# 28. Phase 0: foundation

Goal:

Get infrastructure, architecture and deployment working.

Build:

- Next.js project
- TypeScript
- Tailwind
- shadcn/ui
- Drizzle
- Neon
- GitHub OAuth
- single-user allowlist
- basic application shell
- CI
- Vercel deployment
- environment setup
- initial schema
- docs

Use `gh` and `vercel` where useful.

Acceptance criteria:

- app runs locally
- app deploys on Vercel
- GitHub login works
- unauthorized accounts cannot enter
- database migrations work
- CI performs typecheck, tests and production build
- `PROJECT_STATE.md` is current

Do not build AI yet.

---

# 29. Phase 1: writing core

Goal:

Make the product useful as a manual writing application before AI complexity.

Build:

- article library
- create article
- blank article mode
- Tiptap editor
- autosave
- local recovery
- article status
- word count
- reading time
- basic tags
- version checkpoints
- editor layout
- themes
- theme editor
- theme persistence
- focus mode

Acceptance criteria:

- user can write comfortably for an extended session
- refresh does not lose writing
- theme switching does not alter article content
- article can be reopened from another browser
- version checkpoint can be created
- UI feels like a writing app, not admin software

---

# 30. Phase 2: AI-assisted start

Goal:

Implement the way Tim currently begins new writing.

Build:

- premise screen
- writing session
- streamed AI conversation
- interview skill
- structured working brief
- brief editing
- "Create first draft"
- draft skill
- insert generated draft into editor
- initial AI version snapshot
- AI run logging

Acceptance criteria:

- user can give only a premise
- AI asks useful questions one at a time
- AI does not require exactly five questions
- user can end interview whenever desired
- working brief updates during conversation
- first draft incorporates interview details
- conversation remains accessible after drafting

This is the first major product milestone.

---

# 31. Phase 3: precision AI

Goal:

Make AI useful during real editing without taking over the writing process.

Build:

- selection detection
- AI selection toolbar
- editor skill
- free-form selection instruction
- suggestion model
- visual diff
- accept
- reject
- humanizer
- article critic
- AI run history

Acceptance criteria:

- AI never silently edits prose
- every transformation is reviewable
- user can accept or reject individual suggestions
- humanizer identifies problems before rewriting them
- critic can review the entire article without modifying it

This is the second major product milestone.

---

# 32. Phase 4: writing memory

Goal:

Turn the archive into useful context.

Build:

- importer for timbenniks.dev writing
- archive document model
- article parsing
- chunking
- pgvector
- embeddings
- literal search
- semantic search
- hybrid search
- related writing panel
- AI retrieval tool
- "Have I written this before?"
- seed voice profile from existing voice repository

Acceptance criteria:

- published writing appears in the app
- search finds articles by words
- semantic search finds conceptually related pieces
- new article flow can surface related previous work
- AI can use retrieved excerpts
- prompts never include the entire archive by default

This is where the product becomes uniquely useful.

---

# 33. Phase 5: variants

Goal:

Separate writing from distribution.

Build:

- publication variant model
- destination profile system
- repurpose skill
- LinkedIn post variant
- LinkedIn long-form variant
- newsletter variant
- website variant
- stale-variant detection
- editable variants
- regeneration protection

Acceptance criteria:

- one article can have several destination versions
- variants can be manually edited
- canonical changes do not overwrite variants
- UI visibly identifies stale variants
- destination rules are independent modules

---

# 34. Phase 6: website publishing

Goal:

Publish timbenniks.dev articles directly from the app.

Build:

- website metadata UI
- deterministic slug generation
- deterministic reading time
- deterministic frontmatter generation
- Markdown serialization
- publisher validation
- preview
- GitHub API integration
- create article file
- update existing article
- commit tracking
- published URL tracking

Acceptance criteria:

- generated output matches the existing website format
- publish creates a valid GitHub commit
- updating an article changes the correct file
- secrets remain server-side
- published article retains relationship to its canonical source and version

At the end of this phase, the app should replace the current website writing/publishing workflow.

---

# 35. Phase 7: polish and advanced workflow

Possible work:

- richer version comparisons
- better AI annotations
- command palette
- keyboard shortcuts
- improved theme builder
- Cloudinary integration
- hero-image workflows
- source/citation management
- better archive graph
- article relationships
- fragments
- research notes
- ideas inbox
- GitHub backup/export
- PWA improvements
- offline editing
- analytics
- newsletter provider integration
- Contentstack Developers publisher
- LinkedIn API publishing if practical

Do not pull these into earlier phases unless required.

---

# 36. Things explicitly out of scope initially

Do not build:

- multi-user collaboration
- real-time collaborative cursors
- comments between users
- billing
- teams
- public SaaS onboarding
- arbitrary CMS support
- complex workflow engines
- native desktop app
- mobile-native app
- custom DAM
- custom Git implementation
- autonomous publishing without user confirmation
- automatic regeneration that destroys edited variants

---

# 37. Code organization

Prefer clear domain boundaries.

Suggested structure:

```text
src/
  app/

  components/
    editor/
    writing/
    ai/
    library/
    themes/
    publishing/

  db/
    schema/
    queries/
    migrations/

  ai/
    runtime/
    skills/
    voice/
    tools/

  editor/
    extensions/
    serialization/

  publishing/
    adapters/
      website/
      linkedin/
      newsletter/
      contentstack/

  search/
    embeddings/
    chunking/
    retrieval/

  lib/
```

Avoid giant miscellaneous `utils.ts` files.

Keep destination-specific logic out of core article code.

---

# 38. Engineering conventions

Use server components by default.

Use client components only where interaction requires them.

Keep secrets and OpenAI calls server-side.

Validate external input with Zod.

Use typed database access.

Avoid `any`.

Do not introduce large state-management libraries unless local React state/context becomes genuinely insufficient.

Favor boring, understandable implementation over unnecessary abstractions.

However, maintain strong boundaries around:

- AI skills
- publishers
- editor serialization
- retrieval
- database

Those areas are expected to evolve.

---

# 39. Testing strategy

Do not chase meaningless coverage percentages.

Unit test deterministic behavior thoroughly.

Especially:

- slug generation
- reading time
- frontmatter generation
- serializers
- publisher validation
- theme validation
- article-state transitions
- stale-variant calculation
- retrieval helpers

Integration test:

- database operations
- AI structured-output parsing
- GitHub publisher using mocks

Playwright test critical flows:

```text
log in
create article
write and autosave
reload
start AI article
complete interview
generate draft
edit text
request AI suggestion
accept suggestion
create website variant
preview publication
```

Do not make CI call paid OpenAI APIs.

Use mocks or recorded fixtures.

---

# 40. AI observability

AI behavior will require iteration.

Make debugging possible.

Track:

- skill ID
- skill version
- model
- latency
- token usage
- outcome
- structured-output parse failures
- user accept/reject result where relevant

Do not log API keys.

Add version identifiers to prompts/instruction bundles.

Example:

```text
interview:v1
draft:v3
humanizer:v2
```

This should make it possible to answer:

> Did draft:v4 actually produce better accepted drafts?

later.

---

# 41. Cost controls

Do not retrieve more context than needed.

Do not include the full article archive in prompts.

Do not automatically run expensive reviews after every edit.

Humanizer and critic are explicit user actions.

Use smaller context windows for selection editing.

Cache embeddings.

Only re-embed archive content when it changes.

Display AI usage somewhere in settings later, but this is not required for early phases.

---

# 42. Git and deployment workflow

Before modifying an existing repository:

```text
git status
```

Never destroy unrelated local work.

Commit coherent milestones.

Recommended commit pattern:

```text
feat: establish writing app foundation
feat: add tiptap writing workspace
feat: add guided AI article start
feat: add precision AI editing
feat: add writing archive retrieval
feat: add publication variants
feat: add website publisher
```

Use `gh` for:

- repository operations
- branches
- pull requests if useful
- inspecting the existing voice repository

Use `vercel` for:

- linking project
- environment management
- deployment
- deployment inspection

Again, production application behavior must use APIs rather than invoking local CLI tools.

---

# 43. Implementation workflow for Codex

Do not attempt to build all phases in one enormous pass.

For every phase:

1. Read `docs/product-spec.md`.
2. Read `PROJECT_STATE.md`.
3. Read the relevant phase document.
4. Inspect existing implementation.
5. Create a concise implementation plan inside the phase document.
6. Implement the smallest coherent slice.
7. Run tests.
8. Run typecheck.
9. Run production build.
10. Fix failures.
11. Manually inspect the affected UI where possible.
12. Update documentation.
13. Update `PROJECT_STATE.md`.
14. Commit the completed phase or coherent milestone.

Never mark a phase complete when its acceptance criteria fail.

If a later phase reveals an architecture problem, update `docs/architecture.md` rather than silently introducing a conflicting pattern.

---

# 44. First task

Start with Phase 0 only.b

Before implementation:

1. inspect the current directory
2. inspect Git state
3. inspect `timbenniks/timbenniks-writing-voice` using `gh`
4. extract architectural lessons from it
5. create the documentation structure
6. create `docs/product-spec.md` from this specification
7. write `docs/architecture.md`
8. write `docs/data-model.md`
9. write all phase documents
10. write `AGENTS.md`
11. write `PROJECT_STATE.md`

Then implement Phase 0.

Do not start Phase 1 until Phase 0 satisfies its acceptance criteria.

The documentation should make it possible to open a fresh Codex session later and say:

> Continue the next unfinished phase.

and have enough information to proceed safely.
