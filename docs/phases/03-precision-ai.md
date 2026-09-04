# Phase 3: precision AI

## Goal

Make AI useful during editing while preserving Tim's control over every prose change.

## Planned slices

1. ✅ Capture robust Tiptap selections and expose compact preset/free-form AI actions.
2. ✅ Implement the editor skill and create pending suggestions without changing the document.
3. ✅ Add anchored visual diffs with guarded accept, reject, and superseded states.
4. ✅ Convert editorial seed material into structured, versioned humanizer detections.
5. ✅ Add a read-only whole-article critic and AI run history.
6. ✅ Test concurrent edits, stale selection anchors, failed AI calls, and individual outcomes.

## Key decisions to validate

- Original text and an editor bookmark identify the intended passage safely.
- Accept refuses to apply a suggestion when its source passage changed.
- Humanizer detection and rewriting are separate actions.
- Critic findings attach to useful passages without changing content.

## Acceptance criteria

- AI never silently edits existing prose.
- Every transformation is reviewable.
- Suggestions can be accepted or rejected individually.
- Humanizer reports issues before offering rewrites.
- Critic reviews a full article without modifying it.

This is the second major product milestone.

## Current checkpoint

Phase 3 is complete locally. Selection transformations run through `article-selection-editor/v1` and persist reviewable original/suggested diffs without changing canonical prose. Accept reconstructs the exact replacement server-side and atomically advances the article only when its revision and bookmarked passage still match; Reject and superseded outcomes preserve prose. Large accepted replacements receive a pre-change checkpoint.

`article-humanizer-review/v1` uses a curated, versioned subset of the audited editorial pattern catalog and detects before rewriting. Each rewrite is a separate explicit pending suggestion. `article-critic-review/v1` reviews claims, repetition, transitions, contradictions, abstraction, generated prose, opening, ending, and evidence without editing. Revisioned results and safe AI run history remain visible in the editor.

Migration `0009_large_quasar.sql` is additive, applied, and verified. Drizzle validation, ESLint, standalone TypeScript, 58 unit tests, and the normal Turbopack production build pass. Credential-free Playwright passes four auth checks with twelve intentional skips. Deterministic authenticated acceptance passes the guided and precision flows at desktop and 390 × 844; the precision flow proves reject, accept/reload, Humanizer-before-rewrite, Critic, and stale-suggestion refusal. Manual browser inspection found zero horizontal overflow or console errors at both widths. Fixture cleanup restored 82 articles and zero suggestions, reviews, sessions, messages, or briefs.

All acceptance criteria pass. Completion commit `559e6cf` passed GitHub Actions run `33874955804` in 2m22s. Vercel deployment `dpl_EYvVuNMnZNmMXJ675ovM7G3egpBw` reached Ready and owns the canonical Production alias. Tim can run the Production acceptance check before Phase 4 begins.
