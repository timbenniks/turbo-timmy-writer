# Phase 5: variants

## Goal

Separate canonical writing from destination-specific distribution.

## Planned slices

1. Add variants, source-version relationships, content hashes, and tested stale detection.
2. Add independent versioned destination profiles and the repurpose skill.
3. Add editable LinkedIn post and long-form variants.
4. Add editable newsletter and website variants with typed metadata.
5. Add stale warnings, review choices, regeneration protection, and pre-regeneration snapshots.
6. Test canonical changes, manual edits, and concurrent regeneration decisions.

## Acceptance criteria

- One article supports several destination variants.
- Variants remain manually editable.
- Canonical edits never overwrite variants.
- Stale variants are clearly identified.
- Regeneration cannot silently destroy edits.
- Destination rules remain independent modules.
