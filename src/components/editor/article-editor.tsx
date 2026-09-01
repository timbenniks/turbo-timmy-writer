"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowLeft,
  Bold,
  Code,
  CodeXml,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  PanelRightClose,
  Quote,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { articleDisplayTitle, articleStatusLabel, type ArticleStatus } from "@/articles/model";
import { saveArticleAction } from "@/app/actions/articles";
import { Button } from "@/components/ui/button";
import {
  ARTICLE_DOCUMENT_VERSION,
  normalizeArticleDocument,
  type ArticleDocument,
} from "@/editor/document";

const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    strike: false,
    underline: false,
    hardBreak: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
    },
  }),
  Image.configure({
    inline: false,
    allowBase64: false,
    HTMLAttributes: {
      class: "article-image",
    },
  }),
];

type SaveState = "saved" | "unsaved" | "saving" | "error";

type ArticleEditorProps = {
  articleId: string;
  initialTitle: string;
  initialDocument: ArticleDocument;
  status: ArticleStatus;
  updatedAt: string;
};

function formatSavedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-8 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-35 ${
        active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function ArticleEditor({
  articleId,
  initialTitle,
  initialDocument,
  status,
  updatedAt,
}: ArticleEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState(updatedAt);
  const [saveMessage, setSaveMessage] = useState("");
  const [, setToolbarRevision] = useState(0);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const changeRevisionRef = useRef(0);

  const editor = useEditor({
    extensions: editorExtensions,
    content: initialDocument,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap article-prose",
        "aria-label": "Article body",
      },
    },
    onUpdate: () => {
      changeRevisionRef.current += 1;
      setSaveState("unsaved");
      setSaveMessage("");
    },
    onSelectionUpdate: () => setToolbarRevision((revision) => revision + 1),
    onTransaction: () => setToolbarRevision((revision) => revision + 1),
  });

  const saveArticle = useCallback(async () => {
    if (!editor || saveState === "saving") {
      return;
    }

    // ProseMirror attribute maps can have non-plain prototypes. Normalize through
    // JSON before crossing React's server-action serialization boundary.
    const parsedDocument = normalizeArticleDocument(editor.getJSON());
    if (!parsedDocument.success) {
      setSaveState("error");
      setSaveMessage("This document contains unsupported content.");
      return;
    }

    setSaveState("saving");
    setSaveMessage("");
    const revisionAtSave = changeRevisionRef.current;

    try {
      const result = await saveArticleAction({
        articleId,
        documentVersion: ARTICLE_DOCUMENT_VERSION,
        title,
        documentJson: parsedDocument.data,
      });

      if (!result.ok) {
        setSaveState("error");
        setSaveMessage(result.message);
        return;
      }

      setSavedAt(result.savedAt);
      setSaveState(
        changeRevisionRef.current === revisionAtSave ? "saved" : "unsaved",
      );
    } catch {
      setSaveState("error");
      setSaveMessage("The save failed. Your edits are still open in this tab.");
    }
  }, [articleId, editor, saveState, title]);

  useEffect(() => {
    function handleSaveShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveArticle();
      }
    }

    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, [saveArticle]);

  useLayoutEffect(() => {
    if (!titleRef.current) return;
    titleRef.current.style.height = "0px";
    titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
  }, [title]);

  function setLink() {
    if (!editor) return;
    const previousUrl = String(editor.getAttributes("link").href ?? "");
    const url = window.prompt("Link URL", previousUrl || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function addImage() {
    if (!editor) return;
    const source = window.prompt("External image URL", "https://");
    if (!source?.trim()) return;
    const alt = window.prompt("Image description (alt text)", "") ?? "";
    editor.chain().focus().setImage({ src: source.trim(), alt }).run();
  }

  const statusText =
    saveState === "saving"
      ? "Saving…"
      : saveState === "unsaved"
        ? "Unsaved changes"
        : saveState === "error"
          ? saveMessage
          : `Saved at ${formatSavedAt(savedAt)}`;

  return (
    <>
      <header className="flex min-h-16 items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <Button variant="outline" size="icon" asChild aria-label="Back to library">
          <Link href="/">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{articleDisplayTitle(title)}</p>
          <p className={`truncate text-xs ${saveState === "error" ? "text-red-700" : "text-muted-foreground"}`}>
            {statusText}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground sm:inline">
            {articleStatusLabel(status)}
          </span>
          <Button variant="ghost" size="icon" aria-label="Close assistant">
            <PanelRightClose />
          </Button>
          <Button size="sm" type="button" disabled={!editor || saveState === "saving"} onClick={() => void saveArticle()}>
            <Save />
            Save
          </Button>
        </div>
      </header>

      <div className="editor-toolbar flex min-h-11 items-center gap-0.5 overflow-x-auto border-b border-border bg-surface px-3 py-1.5 sm:px-5">
        <ToolbarButton label="Undo" disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()}>
          <Undo2 />
        </ToolbarButton>
        <ToolbarButton label="Redo" disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()}>
          <Redo2 />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolbarButton label="Heading 2" active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 />
        </ToolbarButton>
        <ToolbarButton label="Heading 3" active={editor?.isActive("heading", { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 />
        </ToolbarButton>
        <ToolbarButton label="Bold" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic />
        </ToolbarButton>
        <ToolbarButton label="Inline code" active={editor?.isActive("code")} onClick={() => editor?.chain().focus().toggleCode().run()}>
          <Code />
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor?.isActive("link")} onClick={setLink}>
          <LinkIcon />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <ToolbarButton label="Bulleted list" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered />
        </ToolbarButton>
        <ToolbarButton label="Blockquote" active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
          <Quote />
        </ToolbarButton>
        <ToolbarButton label="Code block" active={editor?.isActive("codeBlock")} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
          <CodeXml />
        </ToolbarButton>
        <ToolbarButton label="Horizontal rule" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
          <Minus />
        </ToolbarButton>
        <ToolbarButton label="External image" onClick={addImage}>
          <ImageIcon />
        </ToolbarButton>
      </div>

      <article className="mx-auto w-full max-w-[800px] flex-1 px-6 py-12 sm:px-12 sm:py-16">
        <label htmlFor="article-title" className="sr-only">Article title</label>
        <textarea
          ref={titleRef}
          id="article-title"
          rows={1}
          value={title}
          maxLength={200}
          placeholder="Untitled article"
          onChange={(event) => {
            setTitle(event.target.value);
            changeRevisionRef.current += 1;
            setSaveState("unsaved");
            setSaveMessage("");
          }}
          className="block w-full resize-none overflow-hidden border-0 bg-transparent font-serif text-4xl leading-[1.08] font-medium tracking-[-0.035em] outline-none placeholder:text-muted-foreground/55 sm:text-[3.35rem]"
        />
        <div className="mt-10">
          <EditorContent editor={editor} />
        </div>
      </article>

      <footer className="flex min-h-11 items-center border-t border-border px-4 py-2 text-xs text-muted-foreground sm:px-6">
        <span>Quiet theme</span>
        <span className={`ml-auto ${saveState === "error" ? "text-red-700" : ""}`}>
          {statusText} · ⌘S
        </span>
      </footer>
    </>
  );
}
