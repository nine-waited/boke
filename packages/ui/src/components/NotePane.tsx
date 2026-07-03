import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeLeafMode, noteBaseName, sanitizeNoteTitle, type LeafMode } from "@boke/core";
import { MarkdownEditor, type MarkdownEditorHandle } from "./MarkdownEditor.js";
import { MarkdownSourceEditor, type MarkdownSourceEditorHandle } from "./MarkdownSourceEditor.js";
import { OutlinePanel } from "./OutlinePanel.js";
import type { OutlineHeading } from "../markdown-outline.js";
import { formatImageMarkdown, savePastedNoteImage } from "../note-images.js";
import { eventBus, useAppStore, vaultService, workspaceStore } from "../store.js";

interface NotePaneProps {
  path: string;
  mode: LeafMode | string;
  leafId: string;
}

const MODE_OPTIONS: Array<{ id: LeafMode; label: string }> = [
  { id: "live", label: "实时" },
  { id: "source", label: "源码" },
];

function isDefaultUntitledName(name: string): boolean {
  return name === "Untitled" || /^Untitled \d+$/.test(name);
}

function NoteTitleBar({
  path,
  leafId,
  flushContent,
}: {
  path: string;
  leafId: string;
  flushContent: () => Promise<void>;
}) {
  const refreshTree = useAppStore((s) => s.refreshTree);
  const baseName = noteBaseName(path);
  const [draft, setDraft] = useState(baseName);
  const inputRef = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);

  useEffect(() => {
    setDraft(noteBaseName(path));
  }, [path]);

  useEffect(() => {
    if (isDefaultUntitledName(baseName)) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [path, baseName]);

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
      console.warn("[boke] rename failed:", err);
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
      <input
        ref={inputRef}
        className="boke-note-title-input"
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commitTitle()}
        onKeyDown={onKeyDown}
        placeholder="未命名笔记"
        spellCheck={false}
        aria-label="笔记标题"
      />
    </div>
  );
}

export function NotePane({ path, mode, leafId }: NotePaneProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const viewMode = normalizeLeafMode(mode);
  const liveRef = useRef<MarkdownEditorHandle>(null);
  const sourceRef = useRef<MarkdownSourceEditorHandle>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    setLoading(true);
    vaultService
      .read(path)
      .then(setContent)
      .finally(() => setLoading(false));
    eventBus.emit("file-open", { path });
  }, [path]);

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
      const name = file.name.replace(/\.[^.]+$/, "");
      next = `${next}\n${formatImageMarkdown(imagePath, name)}\n`;
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

  if (loading) {
    return <div style={{ padding: 24, color: "var(--boke-text-muted)" }}>Loading…</div>;
  }

  return (
    <div className="boke-note-layout" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <div className="boke-note-main">
        <NoteTitleBar path={path} leafId={leafId} flushContent={flushContent} />
        <div className={`boke-note-pane boke-note-pane--${viewMode}`}>
          {viewMode === "live" ? (
            <MarkdownEditor
              ref={liveRef}
              key={`${path}:live`}
              presentation="live"
              notePath={path}
              content={content}
              onChange={onChange}
              onSave={onSave}
            />
          ) : (
            <div className="boke-source-pane">
              <MarkdownSourceEditor
                ref={sourceRef}
                key={`${path}:source`}
                notePath={path}
                content={content}
                onChange={onChange}
                onSave={onSave}
              />
            </div>
          )}
        </div>
      </div>
      <OutlinePanel path={path} content={content} onHeadingClick={handleHeadingClick} />
    </div>
  );
}

export function ModeToggle({ leafId, mode }: { leafId: string; mode: string }) {
  const viewMode = normalizeLeafMode(mode);

  return (
    <div className="boke-mode-toggle">
      {MODE_OPTIONS.map(({ id, label }) => (
        <button
          key={id}
          className={viewMode === id ? "active" : ""}
          onClick={() => workspaceStore.setMode(leafId, id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
