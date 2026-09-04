"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { ArrowRight, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import {
  captureArticleSelection,
  editorSelectionActions,
  type ArticleSelectionSnapshot,
  type EditorSelectionActionId,
} from "@/editor/selection";

export type PreparedEditorAction = {
  actionId: EditorSelectionActionId | "custom";
  label: string;
  instruction: string | null;
  selection: ArticleSelectionSnapshot;
};

type SelectionAiMenuProps = {
  editor: Editor;
  sourceRevision: () => number;
  onPrepare: (action: PreparedEditorAction) => void;
};

const bubbleMenuOptions = { placement: "top" as const, offset: 10 };

export function SelectionAiMenu({
  editor,
  sourceRevision,
  onPrepare,
}: SelectionAiMenuProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const shouldShow = useCallback(
    ({ editor: activeEditor }: { editor: Editor }) =>
      activeEditor.isEditable &&
      captureArticleSelection(
        activeEditor.state.doc,
        activeEditor.state.selection,
        sourceRevision(),
      ).ok,
    [sourceRevision],
  );

  function prepareAction(
    actionId: PreparedEditorAction["actionId"],
    label: string,
    customInstruction: string | null = null,
  ) {
    const result = captureArticleSelection(
      editor.state.doc,
      editor.state.selection,
      sourceRevision(),
    );
    if (!result.ok) return;

    onPrepare({
      actionId,
      label,
      instruction: customInstruction,
      selection: result.selection,
    });
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="article-ai-selection-menu"
      options={bubbleMenuOptions}
      shouldShow={shouldShow}
      className="max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-surface p-1.5 shadow-[0_12px_36px_rgba(37,32,24,0.18)]"
    >
      <div
        role="toolbar"
        aria-label="AI writing actions"
        className="editor-toolbar flex max-w-full items-center gap-1 overflow-x-auto"
      >
        <span className="flex shrink-0 items-center gap-1 px-1.5 text-xs font-semibold text-accent">
          <Sparkles className="size-3.5" />
          AI
        </span>
        {editorSelectionActions.map((action) => (
          <button
            key={action.id}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => prepareAction(action.id, action.label)}
            className="h-8 shrink-0 rounded-lg px-2.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          aria-expanded={customOpen}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setCustomOpen((open) => !open)}
          className="h-8 shrink-0 rounded-lg px-2.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        >
          Ask AI…
        </button>
      </div>
      {customOpen ? (
        <form
          className="mt-1.5 flex min-w-64 items-center gap-1.5 border-t border-border pt-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            const nextInstruction = instruction.trim();
            if (!nextInstruction) return;
            prepareAction("custom", "Ask AI", nextInstruction);
          }}
        >
          <label htmlFor="selection-ai-instruction" className="sr-only">
            Ask AI about this selection
          </label>
          <input
            id="selection-ai-instruction"
            autoFocus
            value={instruction}
            maxLength={500}
            placeholder="What should change?"
            onChange={(event) => setInstruction(event.target.value)}
            className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-editor px-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
          />
          <button
            type="submit"
            aria-label="Prepare custom AI action"
            disabled={!instruction.trim()}
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-background disabled:opacity-35"
          >
            <ArrowRight className="size-3.5" />
          </button>
        </form>
      ) : null}
    </BubbleMenu>
  );
}
