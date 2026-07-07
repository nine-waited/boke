import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "../i18n/index.js";
import { wheelShortcutMatches } from "../markdown-editor-keymap.js";
import { useAppStore } from "../store.js";

const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;

interface EditorZoomHostProps {
  children: ReactNode;
}

export function EditorZoomHost({ children }: EditorZoomHostProps) {
  const t = useT();
  const editorZoom = useAppStore((s) => s.editorZoom);
  const setEditorZoom = useAppStore((s) => s.setEditorZoom);
  const keyboardShortcuts = useAppStore((s) => s.keyboardShortcuts);
  const hostRef = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState<number | null>(null);
  const hintTimer = useRef<number | null>(null);

  const showHint = useCallback((value: number) => {
    setHint(value);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(null), 1200);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const onWheel = (event: WheelEvent) => {
      if (!wheelShortcutMatches(event, keyboardShortcuts)) return;
      event.preventDefault();
      const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, useAppStore.getState().editorZoom + delta));
      if (next === useAppStore.getState().editorZoom) return;
      setEditorZoom(next);
      showHint(next);
    };

    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, [keyboardShortcuts, setEditorZoom, showHint]);

  useEffect(() => {
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    };
  }, []);

  const scale = editorZoom / 100;

  return (
    <div ref={hostRef} className="boke-editor-zoom-host" style={{ ["--boke-editor-zoom" as string]: String(scale) }}>
      {children}
      {hint !== null && (
        <div className="boke-editor-zoom-hint" role="status" aria-live="polite">
          {t("note.editorZoomHint", { percent: hint })}
        </div>
      )}
    </div>
  );
}
