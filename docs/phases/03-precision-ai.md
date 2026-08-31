# Phase 3: precision AI

## Goal

Make AI useful during editing while preserving Tim's control over every prose change.

## Planned slices

1. Capture robust Tiptap selections and expose compact preset/free-form AI actions.
2. Implement the editor skill and create pending suggestions without changing the document.
3. Add anchored visual diffs with guarded accept, reject, and superseded states.
4. Convert editorial seed material into structured, versioned humanizer detections.
5. Add a read-only whole-article critic and AI run history.
6. Test concurrent edits, stale selection anchors, failed AI calls, and individual outcomes.

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
