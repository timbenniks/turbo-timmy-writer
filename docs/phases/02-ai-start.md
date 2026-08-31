# Phase 2: AI-assisted start

## Goal

Implement the premise-to-interview-to-brief-to-first-draft workflow.

## Planned slices

1. Add the versioned AI runtime, model configuration, run logging, and mocked provider boundary.
2. Add premise capture, immediate persistence, article-start sessions, and streamed message storage.
3. Implement the interview skill with one question at a time and dynamic completion.
4. Add structured, revisioned brief updates and a collapsible manual brief editor.
5. Implement explicit first-draft generation, stream it into the editor, and create `Initial AI draft`.
6. Keep conversation and brief accessible from the writing workspace; add integration and Playwright coverage.

## Key decisions to validate

- Tim can stop the interview at any time.
- Structured brief parsing recovers safely from invalid provider output.
- Stream interruption retains a truthful AI run and does not corrupt the article.
- A generated first draft is distinguishable from later edits and has a stable snapshot.

## Acceptance criteria

- A premise alone starts a useful conversation.
- The agent asks one useful question at a time and never requires a fixed count.
- Tim can end the interview whenever desired.
- The visible brief evolves and remains manually editable.
- The draft incorporates interview-specific evidence and intent.
- Conversation history remains available after drafting.

This is the first major product milestone.
