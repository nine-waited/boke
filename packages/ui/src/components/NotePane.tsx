import { memo, useCallback, useEffect, useRef, useState } from "react";
import { normalizeLeafMode, noteBaseName, sanitizeNoteTitle, type LeafMode } from "@chestnut/core";
import { EditorZoomHost } from "./EditorZoomHost.js";
import { MarkdownEditor, type MarkdownEditorHandle } from "./MarkdownEditor.js";
import { MarkdownSourceEditor, type MarkdownSourceEditorHandle } from "./MarkdownSourceEditor.js";
import { OutlinePanel } from "./OutlinePanel.js";
import type { OutlineHeading } from "../markdown-outline.js";
import { formatImageMarkdown, savePastedNoteImage } from "../note-images.js";
import { isDefaultUntitledName, useLocale, useT } from "../i18n/index.js";
import { eventBus, useAppStore, vaultService, workspaceStore } from "../store.js";

interface NotePaneProps {
  path: string;
  mode: LeafMode | string;
  leafId: string;
  /** When false, pane is keep-alive hidden; editors stay mounted. */
  isActive?: boolean;
}

const MODE_OPTIONS = [
  { id: "live" as const, key: "note.modeLive" },
  { id: "source" as const, key: "note.modeSource" },
];

function NoteTitleBar({
  path,
  leafId,
  mode,
  flushContent,
  isActive,
}: {
  path: string;
  leafId: string;
  mode: LeafMode | string;
  flushContent: () => Promise<void>;
  isActive: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const refreshTree = useAppStore((s) => s.refreshTree);
  const baseName = noteBaseName(path);
  const [draft, setDraft] = useState(baseName);
  const inputRef = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);

  useEffect(() => {
    setDraft(noteBaseName(path));
  }, [path]);

  useEffect(() => {
    if (!isActive) return;
    if (isDefaultUntitledName(baseName, locale)) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [path, baseName, locale, isActive]);

  const commitTitle = useCallback(async () => {
    if (committingRef.current) return;
    const trimmed = draft.trim();
    if (!trimmed || sanitizeNoteTitle(trimmed) === noteBaseName(path)) return;

    committingRef.current = true;
    try {
      await flushContent();
      const newPath = await vaultService.renameNote(path, trimmed);
      if (newPath !== path) {
        workspaceStore.updatePath(leafId, newPath);
        refreshTree();
      }
    } catch (err) {
      console.warn("[Chestnut] rename failed:", err);
      setDraft(noteBaseName(path));
    } finally {
      committingRef.current = false;
    }
  }, [draft, path, leafId, flushContent, refreshTree]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commitTitle();
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setDraft(noteBaseName(path));
      inputRef.current?.blur();
    }
  };

  return (
    <div className="boke-note-title-bar">
      <ModeToggle leafId={leafId} mode={mode} />
      <input
        ref={inputRef}
        className="boke-note-title-input"
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commitTitle()}
        onKeyDown={onKeyDown}
        placeholder={t("note.untitledPlaceholder")}
        spellCheck={false}
        aria-label={t("note.titleAria")}
      />
    </div>
  );
}

export const NotePane = memo(function NotePane({ path, mode, leafId, isActive = true }: NotePaneProps) {
  const t = useT();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const loadedOnceRef = useRef(false);
  const viewMode = normalizeLeafMode(mode);
  const [liveMounted, setLiveMounted] = useState(() => viewMode === "live");
  const [sourceMounted, setSourceMounted] = useState(() => viewMode === "source");
  const liveRef = useRef<MarkdownEditorHandle>(null);
  const sourceRef = useRef<MarkdownSourceEditorHandle>(null);
  const notePaneRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    let cancelled = false;
    // Avoid unmounting editors on keep-alive revisit — only block UI on first load.
    if (!loadedOnceRef.current) setLoading(true);
    vaultService
      .read(path)
      .then((text) => {
        if (cancelled) return;
        setContent(text);
        loadedOnceRef.current = true;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    eventBus.emit("file-open", { path });
    return () => {
      cancelled = true;
    };
  }, [path]);

  useEffect(() => {
    // Keep whichever modes the user has opened; never tear them down on tab hide.
    if (viewMode === "live") setLiveMounted(true);
    if (viewMode === "source") setSourceMounted(true);
  }, [viewMode]);

  const onChange = useCallback(
    (next: string) => {
      setContent(next);
      vaultService.write(path, next);
    },
    [path],
  );

  const onSave = useCallback(() => {
    vaultService.write(path, content, true);
  }, [path, content]);

  const flushContent = useCallback(async () => {
    await vaultService.write(path, contentRef.current, true);
  }, [path]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    let next = contentRef.current;
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const imagePath = await savePastedNoteImage(path, file);
      next = `${next}\n${formatImageMarkdown(imagePath, "")}\n`;
    }
    if (next !== contentRef.current) {
      onChange(next);
    }
  }, [path, onChange]);

  const handleHeadingClick = useCallback(
    (heading: OutlineHeading) => {
      if (viewMode === "source") {
        sourceRef.current?.goToDocLine(heading.docLine);
      } else {
        liveRef.current?.goToDocLine(heading.docLine, content);
      }
    },
    [viewMode, content],
  );

  if (loading && !loadedOnceRef.current) {
    return <div style={{ padding: 24, color: "var(--boke-text-muted)" }}>{t("note.loading")}</div>;
  }

  return (
    <div className="boke-note-layout" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <div className="boke-note-main">
        <NoteTitleBar
          path={path}
          leafId={leafId}
          mode={mode}
          flushContent={flushContent}
          isActive={isActive}
        />
        <EditorZoomHost>
          <div ref={notePaneRef} className={`boke-note-pane boke-note-pane--${viewMode}`}>
            {liveMounted && (
              <div
                className={`boke-note-mode-slot${viewMode === "live" ? " is-active" : ""}`}
                aria-hidden={viewMode !== "live"}
              >
                <MarkdownEditor
                  ref={liveRef}
                  presentation="live"
                  notePath={path}
                  content={content}
                  onChange={onChange}
                  onSave={onSave}
                  active={isActive && viewMode === "live"}
                />
              </div>
            )}
            {sourceMounted && (
              <div
                className={`boke-note-mode-slot boke-source-pane${viewMode === "source" ? " is-active" : ""}`}
                aria-hidden={viewMode !== "source"}
              >
                <MarkdownSourceEditor
                  ref={sourceRef}
                  leafId={leafId}
                  notePath={path}
                  content={content}
                  onChange={onChange}
                  onSave={onSave}
                  active={isActive && viewMode === "source"}
                />
              </div>
            )}
          </div>
        </EditorZoomHost>
      </div>
      <OutlinePanel path={path} content={content} onHeadingClick={handleHeadingClick} />
    </div>
  );
});

export function ModeToggle({ leafId, mode }: { leafId: string; mode: string }) {
  const t = useT();
  const viewMode = normalizeLeafMode(mode);

  const toggleMode = () => {
    workspaceStore.setMode(leafId, viewMode === "live" ? "source" : "live");
  };

  return (
    <button
      type="button"
      className="boke-mode-switch"
      data-mode={viewMode}
      role="switch"
      aria-checked={viewMode === "source"}
      aria-label={t("note.modeSwitchAria")}
      onClick={toggleMode}
    >
      <span className="boke-mode-switch__thumb" aria-hidden="true" />
      {MODE_OPTIONS.map(({ id, key }) => (
        <span
          key={id}
          className={`boke-mode-switch__label${viewMode === id ? " is-active" : ""}`}
          aria-hidden="true"
        >
          {t(key)}
        </span>
      ))}
    </button>
  );
}
