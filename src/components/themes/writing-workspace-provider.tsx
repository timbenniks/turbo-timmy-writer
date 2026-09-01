"use client";

import { Check, Copy, Focus, Heart, Palette, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  deleteThemeAction,
  duplicateThemeAction,
  setDefaultThemeAction,
  toggleFavoriteThemeAction,
  updateThemeAction,
} from "@/app/actions/themes";
import { Button } from "@/components/ui/button";
import {
  duplicateThemeName,
  themeNameSchema,
  themeSettingsSchema,
  type ThemeSettings,
  type WritingTheme,
} from "@/themes/model";

type WorkspaceThemeContextValue = {
  activeTheme: WritingTheme;
  focusMode: boolean;
  openThemes: () => void;
  toggleFocusMode: () => void;
};

const WorkspaceThemeContext = createContext<WorkspaceThemeContextValue | null>(null);

function themeStyle(theme: WritingTheme): CSSProperties {
  const { appearance, editor } = theme.settings;
  return {
    "--background": appearance.background,
    "--foreground": appearance.foreground,
    "--surface": `color-mix(in srgb, ${appearance.background} 90%, ${appearance.foreground})`,
    "--sidebar": `color-mix(in srgb, ${appearance.background} 94%, ${appearance.foreground})`,
    "--editor": appearance.background,
    "--assistant": `color-mix(in srgb, ${appearance.background} 96%, ${appearance.foreground})`,
    "--copy": appearance.foreground,
    "--muted": `color-mix(in srgb, ${appearance.background} 86%, ${appearance.foreground})`,
    "--muted-foreground": appearance.muted,
    "--border": `color-mix(in srgb, ${appearance.background} 78%, ${appearance.foreground})`,
    "--accent": appearance.accent,
    "--accent-soft": `color-mix(in srgb, ${appearance.background} 82%, ${appearance.accent})`,
    "--ring": appearance.accent,
    "--selection": appearance.selection,
    "--article-font": editor.fontFamily === "serif"
      ? "var(--font-lora)"
      : editor.fontFamily === "mono"
        ? "var(--font-geist-mono)"
        : "var(--font-geist-sans)",
    "--article-font-size": `${editor.fontSize}px`,
    "--article-line-height": String(editor.lineHeight),
    "--article-max-width": `${editor.maxWidth}px`,
  } as CSSProperties;
}

export function WritingWorkspaceProvider({
  themes: initialThemes,
  children,
}: {
  themes: WritingTheme[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [themes, setThemes] = useState(initialThemes);
  const initialTheme = initialThemes.find((theme) => theme.isDefault)
    ?? initialThemes.find((theme) => theme.name === "Quiet")
    ?? initialThemes[0];
  if (!initialTheme) throw new Error("At least one writing theme is required.");
  const [activeThemeId, setActiveThemeId] = useState(initialTheme.id);
  const [focusMode, setFocusMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const activeTheme = themes.find((theme) => theme.id === activeThemeId) ?? themes[0] ?? initialTheme;
  const [draftName, setDraftName] = useState(activeTheme.name);
  const [draftSettings, setDraftSettings] = useState(activeTheme.settings);
  const draftSettingsResult = useMemo(
    () => themeSettingsSchema.safeParse(draftSettings),
    [draftSettings],
  );
  const draftIsValid = themeNameSchema.safeParse(draftName).success && draftSettingsResult.success;
  const previewTheme = useMemo<WritingTheme>(
    () => panelOpen && !activeTheme.isBuiltin && draftSettingsResult.success
      ? {
          ...activeTheme,
          name: draftName.trim() || activeTheme.name,
          settings: draftSettingsResult.data,
        }
      : activeTheme,
    [activeTheme, draftName, draftSettingsResult, panelOpen],
  );
  const draftIsDirty = !activeTheme.isBuiltin && (
    draftName.trim() !== activeTheme.name
    || JSON.stringify(draftSettings) !== JSON.stringify(activeTheme.settings)
  );

  useEffect(() => {
    function handleFocusShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFocusMode((current) => !current);
      }
      if (event.key === "Escape") {
        setFocusMode(false);
        setPanelOpen(false);
        setDraftName(activeTheme.name);
        setDraftSettings(activeTheme.settings);
        setMessage("");
      }
    }
    window.addEventListener("keydown", handleFocusShortcut);
    return () => window.removeEventListener("keydown", handleFocusShortcut);
  }, [activeTheme]);

  const context = useMemo(() => ({
    activeTheme: previewTheme,
    focusMode,
    openThemes: () => {
      setDraftName(activeTheme.name);
      setDraftSettings(activeTheme.settings);
      setMessage("");
      setPanelOpen(true);
    },
    toggleFocusMode: () => setFocusMode((current) => !current),
  }), [activeTheme, previewTheme, focusMode]);

  function closeThemePanel() {
    setDraftName(activeTheme.name);
    setDraftSettings(activeTheme.settings);
    setMessage("");
    setPanelOpen(false);
  }

  function patchEditor(settings: Partial<ThemeSettings["editor"]>) {
    setDraftSettings((current) => ({ ...current, editor: { ...current.editor, ...settings } }));
  }
  function patchAppearance(settings: Partial<ThemeSettings["appearance"]>) {
    setDraftSettings((current) => ({ ...current, appearance: { ...current.appearance, ...settings } }));
  }
  function patchChrome(settings: Partial<ThemeSettings["chrome"]>) {
    setDraftSettings((current) => ({ ...current, chrome: { ...current.chrome, ...settings } }));
  }

  function selectTheme(theme: WritingTheme) {
    setActiveThemeId(theme.id);
    setDraftName(theme.name);
    setDraftSettings(theme.settings);
    setMessage("");
  }

  async function duplicateActiveTheme() {
    setSaving(true);
    const result = await duplicateThemeAction({ themeId: activeTheme.id });
    if (result.ok) {
      const copy: WritingTheme = {
        ...activeTheme,
        id: result.themeId,
        name: duplicateThemeName(activeTheme.name),
        isBuiltin: false,
        isDefault: false,
        isFavorite: false,
      };
      setThemes((current) => [...current, copy]);
      selectTheme(copy);
      setMessage("Custom copy created. You can edit it now.");
      router.refresh();
    } else setMessage(result.message);
    setSaving(false);
  }

  async function saveTheme() {
    setSaving(true);
    const result = await updateThemeAction({
      themeId: activeTheme.id,
      name: draftName,
      settings: draftSettings,
    });
    if (result.ok) {
      setThemes((current) => current.map((theme) =>
        theme.id === activeTheme.id ? { ...theme, name: draftName.trim(), settings: draftSettings } : theme,
      ));
      setMessage("Theme saved.");
      router.refresh();
    } else setMessage(result.message);
    setSaving(false);
  }

  async function makeDefault() {
    setSaving(true);
    const result = await setDefaultThemeAction({ themeId: activeTheme.id });
    if (result.ok) {
      setThemes((current) => current.map((theme) => ({ ...theme, isDefault: theme.id === activeTheme.id })));
      setMessage("Default theme saved.");
      router.refresh();
    } else setMessage(result.message);
    setSaving(false);
  }

  async function toggleFavourite() {
    const result = await toggleFavoriteThemeAction({ themeId: activeTheme.id });
    if (result.ok) {
      setThemes((current) => current.map((theme) => theme.id === activeTheme.id
        ? { ...theme, isFavorite: result.isFavorite }
        : theme));
    } else setMessage(result.message);
  }

  async function deleteActiveTheme() {
    if (activeTheme.isBuiltin || !window.confirm(`Delete “${activeTheme.name}”?`)) return;
    setSaving(true);
    const result = await deleteThemeAction({ themeId: activeTheme.id });
    if (result.ok) {
      const remaining = themes.filter((theme) => theme.id !== activeTheme.id);
      setThemes(remaining);
      const nextTheme = remaining.find((theme) => theme.isDefault)
        ?? remaining.find((theme) => theme.name === "Quiet")
        ?? remaining[0];
      if (nextTheme) selectTheme(nextTheme);
      router.refresh();
    } else setMessage(result.message);
    setSaving(false);
  }

  return (
    <WorkspaceThemeContext.Provider value={context}>
      <main
        className="writing-workspace min-h-screen bg-background p-2 text-foreground sm:p-3"
        data-focus={focusMode ? "true" : "false"}
        data-density={previewTheme.settings.chrome.density}
        data-sidebar={previewTheme.settings.chrome.sidebar}
        style={themeStyle(previewTheme)}
      >
        {children}
      </main>
      {panelOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/25" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeThemePanel();
        }}>
          <section role="dialog" aria-modal="true" aria-label="Writing themes" className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-5 text-foreground shadow-2xl">
            <header className="flex items-center gap-3">
              <Palette className="size-5" />
              <div><h2 className="font-semibold">Writing themes</h2><p className="text-xs text-muted-foreground">Appearance only. Article content stays untouched.</p></div>
              <Button className="ml-auto" variant="ghost" size="icon" aria-label="Close themes" onClick={closeThemePanel}><X /></Button>
            </header>

            <div className="mt-6 grid grid-cols-2 gap-2">
              {themes.map((theme) => (
                <button key={theme.id} type="button" onClick={() => selectTheme(theme)} className={`rounded-xl border p-3 text-left ${theme.id === activeTheme.id ? "border-accent ring-1 ring-accent" : "border-border"}`}>
                  <span className="flex items-center gap-2 text-sm font-medium">{theme.name}{theme.isFavorite ? <Heart className="ml-auto size-3.5 fill-current" /> : null}</span>
                  <span className="mt-2 flex gap-1"><i className="size-4 rounded-full border" style={{ background: theme.settings.appearance.background }} /><i className="size-4 rounded-full" style={{ background: theme.settings.appearance.accent }} /></span>
                  <span className="mt-2 block text-[10px] text-muted-foreground">{theme.isBuiltin ? "Starter" : "Custom"}{theme.isDefault ? " · Default" : ""}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void toggleFavourite()}><Heart />{activeTheme.isFavorite ? "Unfavourite" : "Favourite"}</Button>
              <Button size="sm" variant="outline" disabled={activeTheme.isDefault || saving} onClick={() => void makeDefault()}><Star />Set default</Button>
              {!activeTheme.isBuiltin ? <Button size="sm" variant="outline" disabled={saving} onClick={() => void duplicateActiveTheme()}><Copy />Duplicate</Button> : null}
            </div>

            {activeTheme.isBuiltin ? (
              <div className="mt-6 rounded-xl border border-dashed border-border bg-editor p-5">
                <h3 className="text-sm font-semibold">Starter theme</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Starter themes stay protected so you can always return to their original design. Create a custom copy to change typography, colours, width, density, or sidebar.</p>
                <Button className="mt-4" size="sm" disabled={saving} onClick={() => void duplicateActiveTheme()}><Copy />Duplicate to customise</Button>
                {message ? <p aria-live="polite" className="mt-3 text-xs text-muted-foreground">{message}</p> : null}
              </div>
            ) : (
              <div className="mt-6 space-y-4 border-t border-border pt-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-accent" /><span>{draftIsDirty ? "Live preview · not saved" : "Saved theme"}</span></div>
                <label className="block text-xs font-medium">Name<input value={draftName} maxLength={60} onChange={(event) => setDraftName(event.target.value)} className="mt-1 h-9 w-full rounded-md border bg-editor px-3 text-sm" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-medium">Typeface<select value={draftSettings.editor.fontFamily} onChange={(event) => patchEditor({ fontFamily: event.target.value as ThemeSettings["editor"]["fontFamily"] })} className="mt-1 h-9 w-full rounded-md border bg-editor px-2"><option value="serif">Serif</option><option value="sans">Sans</option><option value="mono">Mono</option></select></label>
                  <label className="text-xs font-medium">Text size<input type="number" min="16" max="28" value={draftSettings.editor.fontSize} onChange={(event) => patchEditor({ fontSize: Math.min(28, Math.max(16, Number(event.target.value))) })} className="mt-1 h-9 w-full rounded-md border bg-editor px-3" /></label>
                  <label className="text-xs font-medium">Line height<input type="number" min="1.35" max="2" step="0.05" value={draftSettings.editor.lineHeight} onChange={(event) => patchEditor({ lineHeight: Math.min(2, Math.max(1.35, Number(event.target.value))) })} className="mt-1 h-9 w-full rounded-md border bg-editor px-3" /></label>
                  <label className="text-xs font-medium">Editor width<input type="number" min="560" max="1000" step="20" value={draftSettings.editor.maxWidth} onChange={(event) => patchEditor({ maxWidth: Math.min(1000, Math.max(560, Number(event.target.value))) })} className="mt-1 h-9 w-full rounded-md border bg-editor px-3" /></label>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {([['background', 'Canvas'], ['foreground', 'Text'], ['muted', 'Muted text'], ['accent', 'Accent'], ['selection', 'Selection']] as const).map(([key, label]) => <label key={key} className="text-xs font-medium">{label}<input type="color" value={draftSettings.appearance[key]} onChange={(event) => patchAppearance({ [key]: event.target.value })} className="mt-1 h-9 w-full rounded-md border bg-editor p-1" /></label>)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-medium">Density<select value={draftSettings.chrome.density} onChange={(event) => patchChrome({ density: event.target.value as ThemeSettings["chrome"]["density"] })} className="mt-1 h-9 w-full rounded-md border bg-editor px-2"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
                  <label className="text-xs font-medium">Sidebar<select value={draftSettings.chrome.sidebar} onChange={(event) => patchChrome({ sidebar: event.target.value as ThemeSettings["chrome"]["sidebar"] })} className="mt-1 h-9 w-full rounded-md border bg-editor px-2"><option value="visible">Visible</option><option value="minimal">Minimal</option><option value="hidden">Hidden</option></select></label>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">Changes preview immediately. Close the panel or switch themes to discard them; save only when the workspace feels right.</p>
                <div className="flex gap-2"><Button size="sm" disabled={saving || !draftIsValid || !draftIsDirty} onClick={() => void saveTheme()}><Check />Save theme</Button><Button size="sm" variant="ghost" disabled={saving} onClick={() => void deleteActiveTheme()}><Trash2 />Delete</Button></div>
                {message ? <p aria-live="polite" className="text-xs text-muted-foreground">{message}</p> : null}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </WorkspaceThemeContext.Provider>
  );
}

export function useWorkspaceTheme() {
  const value = useContext(WorkspaceThemeContext);
  if (!value) throw new Error("useWorkspaceTheme must be used inside WritingWorkspaceProvider.");
  return value;
}

export function WorkspaceAppearanceButtons() {
  const { focusMode, openThemes, toggleFocusMode } = useWorkspaceTheme();
  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Choose writing theme" title="Choose writing theme" onClick={openThemes}><Palette /></Button>
      <Button variant="ghost" size="icon" aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"} title="Focus mode · ⌘⇧F" onClick={toggleFocusMode}><Focus /></Button>
    </>
  );
}
