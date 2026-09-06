# Phase 7: polish and advanced workflow

## Goal

Improve speed, confidence, and reach after the core writing-to-publishing workflow is proven.

## Active objective

Make the finished core workflow straightforward to operate before adding more
product surface. This is documentation and operational hardening, not a new
integration.

### Slice 1: operator getting-started guide

Complete locally on 2026-09-06. `GETTING_STARTED.md` now distinguishes existing
Production setup from optional future configuration and covers a new machine,
all validated environment variables, GitHub OAuth, Neon migrations, OpenAI,
least-privilege website publishing, verification, archive maintenance, and
common failure modes. The README links to it.

Acceptance criteria:

- Every application environment variable has a purpose and setup boundary.
- Secret values are never included, and privileged credentials remain
  server-side.
- Destructive database operations are visibly separated from ordinary setup.
- Publishing setup grants only the repository access the adapter needs.
- Commands and local links match the current repository.

Privacy and cost review: documentation introduces no runtime collection,
external calls, or new dependency. Paid embedding commands remain explicit and
the guide labels them before use.

## Candidate work

- Richer version comparison and AI annotations
- Command palette and broader keyboard shortcuts
- Improved theme builder
- Hero image and optional Cloudinary integration
- Source and citation management
- Archive relationships and graph exploration
- Fragments, research notes, and ideas inbox
- GitHub backup/export
- Progressive web app and deeper offline support
- Usage and product analytics
- Newsletter provider adapter
- Contentstack Developers publisher
- LinkedIn API publishing if a reliable supported API is practical

## Planning rule

Do not treat this list as a commitment or pull items into early phases for convenience. Prioritize from real usage after Phase 6. Give each chosen item its own acceptance criteria, privacy/cost review, and coherent implementation slice.

## Completion signal

Phase 7 is an evolving backlog rather than a single release gate. `PROJECT_STATE.md` should identify the active polish objective and its validation evidence.
