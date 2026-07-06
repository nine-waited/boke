import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { vaultService, useAppStore } from "../store.js";
import { useT } from "../i18n/index.js";
import { parseExcalidrawFile, serializeExcalidrawScene } from "../excalidraw-persist.js";
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";

const Excalidraw = lazy(() =>
  Promise.all([
    import("@excalidraw/excalidraw"),
    import("@excalidraw/excalidraw/index.css"),
  ]).then(([m]) => ({ default: m.Excalidraw })),
);

interface ExcalidrawViewProps {
  path: string;
}

type SceneSnapshot = {
  elements: readonly unknown[];
  appState: unknown;
  files: unknown;
};

export function ExcalidrawView({ path }: ExcalidrawViewProps) {
  const t = useT();
  const theme = useAppStore((s) => s.theme);
  const locale = useAppStore((s) => s.locale);
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestScene = useRef<SceneSnapshot | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    vaultService.read(path).then((raw) => {
      setInitialData(parseExcalidrawFile(raw));
    });
  }, [path]);

  const saveNow = useCallback(async () => {
    const scene = latestScene.current;
    if (!scene) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const payload = serializeExcalidrawScene(scene.elements, scene.appState, scene.files);
    await vaultService.write(path, payload, true);
  }, [path]);

  const scheduleSave = useCallback(
    (elements: readonly unknown[], appState: unknown, files: unknown) => {
      latestScene.current = { elements, appState, files };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void saveNow();
      }, 600);
    },
    [saveNow],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
      if (!wrapRef.current?.contains(document.activeElement)) return;
      event.preventDefault();
      event.stopPropagation();
      void saveNow();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [saveNow]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
  }, [path]);

  if (!initialData) {
    return <div style={{ padding: 24, color: "var(--boke-text-muted)" }}>{t("excalidraw.loading")}</div>;
  }

  const fileName = path.split("/").pop() ?? path;

  return (
    <div ref={wrapRef} className="boke-excalidraw-wrap" tabIndex={-1}>
      <Suspense fallback={<div style={{ padding: 24 }}>{t("excalidraw.loadingApp")}</div>}>
        <Excalidraw
          key={`${path}-${theme}-${locale}`}
          name={fileName}
          theme={theme}
          langCode={locale}
          initialData={initialData}
          onChange={(elements, appState, files) => scheduleSave(elements, appState, files)}
          UIOptions={{
            canvasActions: {
              saveToActiveFile: false,
              export: { saveFileToDisk: false },
            },
          }}
        />
      </Suspense>
    </div>
  );
}
