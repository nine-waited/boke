import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeLeafMode, type LeafMode } from "@boke/core";
import { MarkdownEditor, type MarkdownEditorHandle } from "./MarkdownEditor.js";
import { MarkdownSourceEditor, type MarkdownSourceEditorHandle } from "./MarkdownSourceEditor.js";
import { OutlinePanel } from "./OutlinePanel.js";
import type { OutlineHeading } from "../markdown-outline.js";
import { eventBus, vaultService, workspaceStore } from "../store.js";

interface NotePaneProps {
  path: string;
  mode: LeafMode | string;
  leafId: string;
}

const MODE_OPTIONS: Array<{ id: LeafMode; label: string }> = [
  { id: "live", label: "实时" },
  { id: "source", label: "源码" },
];

export function NotePane({ path, mode, leafId }: NotePaneProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const viewMode = normalizeLeafMode(mode);
  const liveRef = useRef<MarkdownEditorHandle>(null);
  const sourceRef = useRef<MarkdownSourceEditorHandle>(null);

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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const attachmentPath = await vaultService.saveAttachment(file);
      const name = file.name.replace(/\.[^.]+$/, "");
      setContent((c) => `${c}\n![[${attachmentPath}|${name}]]\n`);
    }
  }, []);

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
      <div className={`boke-note-main boke-note-pane boke-note-pane--${viewMode}`}>
        {viewMode === "live" ? (
          <MarkdownEditor
            ref={liveRef}
            key={`${path}:live`}
            presentation="live"
            content={content}
            onChange={onChange}
            onSave={onSave}
          />
        ) : (
          <div className="boke-source-pane">
            <MarkdownSourceEditor
              ref={sourceRef}
              key={`${path}:source`}
              content={content}
              onChange={onChange}
              onSave={onSave}
            />
          </div>
        )}
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
