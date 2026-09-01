"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowLeft,
  Bold,
  BookmarkPlus,
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
  Tag,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  articleDisplayTitle,
  articleStatusLabel,
  availableArticleStatuses,
  type ArticleStatus,
} from "@/articles/model";
import { calculateWritingMetrics } from "@/articles/metrics";
import { updateArticleTagsInputSchema } from "@/articles/organization";
import { hasChangesAfterSaveStarted } from "@/articles/save";
import {
  ARTICLE_RECOVERY_STORAGE_PREFIX,
  ARTICLE_RECOVERY_VERSION,
  articleRecoveryStorageKey,
  decideArticleRecovery,
  parseArticleRecoveryEnvelope,
} from "@/articles/recovery";
import {
  createManualCheckpointAction,
  updateArticleStatusAction,
  updateArticleTagsAction,
} from "@/app/actions/article-organization";
import { saveArticleAction } from "@/app/actions/articles";
import { Button } from "@/components/ui/button";
import {
  ARTICLE_DOCUMENT_VERSION,
  normalizeArticleDocument,
  type ArticleDocument,
} from "@/editor/document";
import { articleDocumentToPlainText } from "@/editor/serialization/plain-text";

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

const AUTOSAVE_DELAY_MS = 900;
const RECOVERY_CLIENT_KEY_PREFIX = "turbo-timmy:article-recovery-client:";

type SaveState = "saved" | "offline" | "saving" | "conflict" | "error";

type ArticleEditorProps = {
  articleId: string;
  initialTitle: string;
  initialDocument: ArticleDocument;
  status: ArticleStatus;
  initialTags: string[];
  initialVersionCount: number;
  initialLatestVersionAt: string | null;
  revision: number;
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
  initialTags,
  initialVersionCount,
  initialLatestVersionAt,
  revision,
  updatedAt,
}: ArticleEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState(updatedAt);
  const [saveMessage, setSaveMessage] = useState("");
  const [articleStatus, setArticleStatus] = useState(status);
  const [statusSaving, setStatusSaving] = useState(false);
  const [tagsDraft, setTagsDraft] = useState(initialTags.join(", "));
  const [tagsSaving, setTagsSaving] = useState(false);
  const [versionCount, setVersionCount] = useState(initialVersionCount);
  const [latestVersionAt, setLatestVersionAt] = useState(initialLatestVersionAt);
  const [checkpointSaving, setCheckpointSaving] = useState(false);
  const [organizationMessage, setOrganizationMessage] = useState("");
  const [organizationError, setOrganizationError] = useState(false);
  const [metrics, setMetrics] = useState(() =>
    calculateWritingMetrics(articleDocumentToPlainText(initialDocument)),
  );
  const [, setToolbarRevision] = useState(0);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const titleValueRef = useRef(initialTitle);
  const savedTagsDraftRef = useRef(initialTags.join(", "));
  const skipNextTagSaveRef = useRef(false);
  const changeRevisionRef = useRef(0);
  const serverRevisionRef = useRef(revision);
  const conflictRevisionRef = useRef<number | null>(null);
  const recoveryKeyRef = useRef<string | null>(null);
  const recoveryClientIdRef = useRef<string | null>(null);
  const recoveryAppliedRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const requestSaveRef = useRef<() => void>(() => undefined);

  const updateMetrics = useCallback((rawDocument: unknown) => {
    const parsedDocument = normalizeArticleDocument(rawDocument);
    if (!parsedDocument.success) return;
    setMetrics(
      calculateWritingMetrics(articleDocumentToPlainText(parsedDocument.data)),
    );
  }, []);

  const ensureRecoveryIdentity = useCallback(() => {
    if (recoveryClientIdRef.current && recoveryKeyRef.current) {
      return {
        clientId: recoveryClientIdRef.current,
        storageKey: recoveryKeyRef.current,
      };
    }

    const sessionKey = `${RECOVERY_CLIENT_KEY_PREFIX}${articleId}`;
    let clientId = sessionStorage.getItem(sessionKey);
    if (!clientId) {
      clientId = crypto.randomUUID();
      sessionStorage.setItem(sessionKey, clientId);
    }

    const storageKey = articleRecoveryStorageKey(articleId, clientId);
    recoveryClientIdRef.current = clientId;
    recoveryKeyRef.current = storageKey;
    return { clientId, storageKey };
  }, [articleId]);

  const persistRecovery = useCallback((rawDocument: unknown) => {
    const parsedDocument = normalizeArticleDocument(rawDocument);
    if (!parsedDocument.success) return false;

    try {
      const { clientId, storageKey } = ensureRecoveryIdentity();
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: ARTICLE_RECOVERY_VERSION,
          articleId,
          clientId,
          baseRevision: serverRevisionRef.current,
          changeRevision: changeRevisionRef.current,
          documentVersion: ARTICLE_DOCUMENT_VERSION,
          title: titleValueRef.current,
          documentJson: parsedDocument.data,
          updatedAt: new Date().toISOString(),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }, [articleId, ensureRecoveryIdentity]);

  const scheduleAutosave = useCallback((delay = AUTOSAVE_DELAY_MS) => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => requestSaveRef.current(), delay);
  }, []);

  const markLocalChange = useCallback((rawDocument: unknown) => {
    changeRevisionRef.current += 1;
    const recovered = persistRecovery(rawDocument);
    if (conflictRevisionRef.current !== null) {
      setSaveState("conflict");
      setSaveMessage("Your local changes conflict with a newer saved version.");
      return;
    }

    setSaveState(recovered ? "offline" : "error");
    setSaveMessage(
      recovered ? "" : "Local recovery is unavailable. Save to the server now.",
    );
    scheduleAutosave();
  }, [persistRecovery, scheduleAutosave]);

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
    onUpdate: ({ editor: updatedEditor }) => {
      const document = updatedEditor.getJSON();
      updateMetrics(document);
      markLocalChange(document);
    },
    onSelectionUpdate: () => setToolbarRevision((revision) => revision + 1),
    onTransaction: () => setToolbarRevision((revision) => revision + 1),
  });

  const saveArticle = useCallback(async () => {
    if (!editor) return;
    if (saveInFlightRef.current) {
      queuedSaveRef.current = true;
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

    if (!persistRecovery(parsedDocument.data)) {
      setSaveState("error");
      setSaveMessage("Local recovery is unavailable. The server save will still be attempted.");
    }

    if (!navigator.onLine) {
      setSaveState("offline");
      setSaveMessage("Offline changes — waiting for a connection.");
      return;
    }

    saveInFlightRef.current = true;
    queuedSaveRef.current = false;
    setSaveState("saving");
    setSaveMessage("");
    const changeRevisionAtSave = changeRevisionRef.current;
    const expectedRevision = serverRevisionRef.current;
    let shouldSaveAgain = false;

    try {
      const result = await saveArticleAction({
        articleId,
        documentVersion: ARTICLE_DOCUMENT_VERSION,
        expectedRevision,
        title: titleValueRef.current,
        documentJson: parsedDocument.data,
      });

      if (!result.ok) {
        if (result.code === "conflict") {
          conflictRevisionRef.current = result.currentRevision;
          setSaveState("conflict");
        } else {
          setSaveState("error");
        }
        setSaveMessage(result.message);
        return;
      }

      serverRevisionRef.current = result.revision;
      setSavedAt(result.savedAt);
      if (!hasChangesAfterSaveStarted(changeRevisionAtSave, changeRevisionRef.current)) {
        if (recoveryKeyRef.current) localStorage.removeItem(recoveryKeyRef.current);
        setSaveState("saved");
        setSaveMessage("");
      } else {
        persistRecovery(editor.getJSON());
        setSaveState("offline");
        setSaveMessage("");
        shouldSaveAgain = true;
      }
    } catch {
      setSaveState("offline");
      setSaveMessage("Offline changes — the server could not be reached.");
    } finally {
      saveInFlightRef.current = false;
      if (shouldSaveAgain || queuedSaveRef.current) scheduleAutosave(100);
    }
  }, [articleId, editor, persistRecovery, scheduleAutosave]);

  useEffect(() => {
    requestSaveRef.current = () => void saveArticle();
  }, [saveArticle]);

  useEffect(() => {
    if (!editor || recoveryAppliedRef.current) return;

    const { storageKey } = ensureRecoveryIdentity();
    const articlePrefix = `${ARTICLE_RECOVERY_STORAGE_PREFIX}${articleId}:`;
    const recoveryEntries: Array<{ key: string; value: NonNullable<ReturnType<typeof parseArticleRecoveryEnvelope>> }> = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(articlePrefix)) continue;
      const value = parseArticleRecoveryEnvelope(localStorage.getItem(key));
      if (value?.articleId === articleId) recoveryEntries.push({ key, value });
    }

    const ownRecovery = recoveryEntries.find((entry) => entry.key === storageKey);
    const selectedRecovery =
      ownRecovery ??
      recoveryEntries.sort(
        (left, right) => Date.parse(right.value.updatedAt) - Date.parse(left.value.updatedAt),
      )[0];

    if (!selectedRecovery) {
      recoveryAppliedRef.current = true;
      return;
    }

    const decision = decideArticleRecovery(selectedRecovery.value, {
      articleId,
      revision,
      title: initialTitle,
      documentJson: initialDocument,
    });

    if (decision.kind === "discard") {
      localStorage.removeItem(selectedRecovery.key);
      recoveryAppliedRef.current = true;
      return;
    }

    const restoreTimer = setTimeout(() => {
      recoveryAppliedRef.current = true;
      recoveryKeyRef.current = selectedRecovery.key;
      recoveryClientIdRef.current = selectedRecovery.value.clientId;
      titleValueRef.current = decision.envelope.title;
      setTitle(decision.envelope.title);
      changeRevisionRef.current = decision.envelope.changeRevision;
      editor.commands.setContent(decision.envelope.documentJson, { emitUpdate: false });
      updateMetrics(decision.envelope.documentJson);

      if (decision.kind === "recover") {
        setSaveState("offline");
        setSaveMessage("Recovered local changes.");
        scheduleAutosave(250);
      } else {
        conflictRevisionRef.current = revision;
        setSaveState("conflict");
        setSaveMessage("Recovered local changes conflict with a newer saved version.");
      }
    }, 0);

    return () => clearTimeout(restoreTimer);
  }, [
    articleId,
    editor,
    ensureRecoveryIdentity,
    initialDocument,
    initialTitle,
    revision,
    scheduleAutosave,
    updateMetrics,
  ]);

  useEffect(() => {
    function handleOnline() {
      if (saveState === "offline") scheduleAutosave(100);
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [saveState, scheduleAutosave]);

  useEffect(
    () => () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    },
    [],
  );

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

  function keepLocalCopy() {
    if (conflictRevisionRef.current === null) return;
    serverRevisionRef.current = conflictRevisionRef.current;
    conflictRevisionRef.current = null;
    setSaveState("offline");
    setSaveMessage("Keeping this tab's copy. Saving it as the newest revision…");
    void saveArticle();
  }

  function reloadSavedCopy() {
    if (recoveryKeyRef.current) localStorage.removeItem(recoveryKeyRef.current);
    window.location.reload();
  }

  async function changeArticleStatus(nextStatus: ArticleStatus) {
    if (nextStatus === articleStatus || statusSaving) return;
    const expectedStatus = articleStatus;
    setStatusSaving(true);
    setOrganizationMessage("");

    try {
      const result = await updateArticleStatusAction({
        articleId,
        expectedStatus,
        nextStatus,
      });
      if (!result.ok) {
        if (result.currentStatus) setArticleStatus(result.currentStatus);
        setOrganizationError(true);
        setOrganizationMessage(result.message);
        return;
      }
      setArticleStatus(result.status);
      setOrganizationError(false);
      setOrganizationMessage(`Status changed to ${articleStatusLabel(result.status)}.`);
    } catch {
      setOrganizationError(true);
      setOrganizationMessage("The status could not be updated.");
    } finally {
      setStatusSaving(false);
    }
  }

  async function saveTags() {
    if (tagsSaving) return;
    if (tagsDraft.trim() === savedTagsDraftRef.current) return;
    const rawTags = tagsDraft
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const parsed = updateArticleTagsInputSchema.safeParse({ articleId, tags: rawTags });
    if (!parsed.success) {
      setOrganizationError(true);
      setOrganizationMessage(
        "Use up to ten comma-separated tags, each at most 40 characters.",
      );
      return;
    }

    setTagsSaving(true);
    setOrganizationMessage("");
    try {
      const result = await updateArticleTagsAction(parsed.data);
      if (!result.ok) {
        setOrganizationError(true);
        setOrganizationMessage(result.message);
        return;
      }
      const canonicalDraft = result.tags.join(", ");
      savedTagsDraftRef.current = canonicalDraft;
      setTagsDraft(canonicalDraft);
      setOrganizationError(false);
      setOrganizationMessage(result.tags.length ? "Tags saved." : "Tags cleared.");
    } catch {
      setOrganizationError(true);
      setOrganizationMessage("The tags could not be updated.");
    } finally {
      setTagsSaving(false);
    }
  }

  async function createCheckpoint() {
    if (saveState !== "saved" || checkpointSaving) return;
    const label = window.prompt("Checkpoint label (optional)", "Manual checkpoint");
    if (label === null) return;

    setCheckpointSaving(true);
    setOrganizationMessage("");
    try {
      const result = await createManualCheckpointAction({
        articleId,
        expectedRevision: serverRevisionRef.current,
        label,
      });
      if (!result.ok) {
        if (result.code === "conflict") {
          conflictRevisionRef.current = result.currentRevision;
          setSaveState("conflict");
          setSaveMessage(result.message);
        }
        setOrganizationError(true);
        setOrganizationMessage(result.message);
        return;
      }
      setVersionCount(result.versionCount);
      setLatestVersionAt(result.createdAt);
      setOrganizationError(false);
      setOrganizationMessage("Manual checkpoint created.");
    } catch {
      setOrganizationError(true);
      setOrganizationMessage("The checkpoint could not be created.");
    } finally {
      setCheckpointSaving(false);
    }
  }

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
      : saveState === "offline"
        ? saveMessage || "Offline changes"
        : saveState === "conflict"
          ? saveMessage || "Save conflict"
        : saveState === "error"
          ? saveMessage
          : `Saved at ${formatSavedAt(savedAt)}`;

  const statusIsWarning = saveState === "error" || saveState === "conflict";

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
          <p className={`truncate text-xs ${statusIsWarning ? "text-amber-700" : "text-muted-foreground"}`}>
            {statusText}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
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

      <div className="editor-toolbar flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border bg-sidebar px-4 py-1.5 text-xs text-muted-foreground sm:flex-nowrap sm:overflow-x-auto sm:px-6">
        <label className="flex shrink-0 items-center gap-2">
          <span className="font-medium text-foreground">Status</span>
          <select
            aria-label="Article status"
            value={articleStatus}
            disabled={statusSaving}
            onChange={(event) => void changeArticleStatus(event.target.value as ArticleStatus)}
            className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-foreground outline-none focus:border-foreground disabled:opacity-50"
          >
            {availableArticleStatuses(articleStatus).map((availableStatus) => (
              <option key={availableStatus} value={availableStatus}>
                {articleStatusLabel(availableStatus)}
              </option>
            ))}
          </select>
        </label>
        <span className="h-5 w-px shrink-0 bg-border" />
        <label className="flex min-w-[190px] max-w-sm flex-1 items-center gap-2">
          <Tag className="size-3.5 shrink-0" />
          <span className="sr-only">Article tags, comma separated</span>
          <input
            aria-label="Article tags"
            value={tagsDraft}
            disabled={tagsSaving}
            placeholder="Add tags, separated by commas"
            onChange={(event) => setTagsDraft(event.target.value)}
            onBlur={() => {
              if (skipNextTagSaveRef.current) {
                skipNextTagSaveRef.current = false;
                return;
              }
              void saveTags();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                skipNextTagSaveRef.current = true;
                setTagsDraft(savedTagsDraftRef.current);
                event.currentTarget.blur();
              }
            }}
            className="h-7 w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-border focus:bg-surface disabled:opacity-50"
          />
        </label>
        <span className="h-5 w-px shrink-0 bg-border" />
        <span className="shrink-0 tabular-nums">
          {metrics.wordCount} {metrics.wordCount === 1 ? "word" : "words"}
        </span>
        <span className="shrink-0 tabular-nums">
          {metrics.readingMinutes === 0 ? "—" : `${metrics.readingMinutes} min read`}
        </span>
        <span className="h-5 w-px shrink-0 bg-border" />
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={saveState !== "saved" || checkpointSaving}
          title={saveState === "saved" ? "Create a manual version checkpoint" : "Wait for the article to save first"}
          onClick={() => void createCheckpoint()}
          className="h-7 shrink-0 px-2.5 text-xs"
        >
          <BookmarkPlus />
          {checkpointSaving ? "Creating…" : "Checkpoint"}
        </Button>
        <span className="shrink-0 tabular-nums" title={latestVersionAt ? `Last checkpoint at ${formatSavedAt(latestVersionAt)}` : undefined}>
          {versionCount} {versionCount === 1 ? "version" : "versions"}
        </span>
      </div>

      {organizationMessage ? (
        <div
          aria-live="polite"
          className={`border-b px-4 py-2 text-xs sm:px-6 ${
            organizationError
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {organizationMessage}
        </div>
      ) : null}

      {saveState === "conflict" ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950 sm:px-6">
          <span className="mr-auto">A newer version was saved elsewhere. Your local copy is still safe.</span>
          <Button variant="outline" size="sm" type="button" onClick={reloadSavedCopy}>
            Reload saved copy
          </Button>
          <Button size="sm" type="button" onClick={keepLocalCopy}>
            Keep this copy
          </Button>
        </div>
      ) : null}

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
            const nextTitle = event.target.value;
            titleValueRef.current = nextTitle;
            setTitle(nextTitle);
            markLocalChange(editor?.getJSON() ?? initialDocument);
          }}
          className="block w-full resize-none overflow-hidden border-0 bg-transparent font-serif text-4xl leading-[1.08] font-medium tracking-[-0.035em] outline-none placeholder:text-muted-foreground/55 sm:text-[3.35rem]"
        />
        <div className="mt-10">
          <EditorContent editor={editor} />
        </div>
      </article>

      <footer className="flex min-h-11 items-center border-t border-border px-4 py-2 text-xs text-muted-foreground sm:px-6">
        <span>Quiet theme</span>
        <span className={`ml-auto ${statusIsWarning ? "text-amber-700" : ""}`}>
          {statusText} · ⌘S
        </span>
      </footer>
    </>
  );
}
