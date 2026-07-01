import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { vaultService } from "../store.js";
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

export function ExcalidrawView({ path }: ExcalidrawViewProps) {
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    vaultService.read(path).then((raw) => {
      setInitialData(parseExcalidrawFile(raw));
    });
  }, [path]);

  const scheduleSave = useCallback(
    (elements: readonly unknown[], appState: unknown, files: unknown) => {
      const payload = serializeExcalidrawScene(elements, appState, files);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        vaultService.write(path, payload, true);
      }, 600);
    },
    [path],
  );
  if (!initialData) {
    return <div style={{ padding: 24, color: "var(--boke-text-muted)" }}>Loading drawing…</div>;
  }

  return (
    <div className="boke-excalidraw-wrap">
      <Suspense fallback={<div style={{ padding: 24 }}>Loading Excalidraw…</div>}>
        <Excalidraw
          key={path}
          theme="light"
          initialData={initialData}
          onChange={(elements, appState, files) => scheduleSave(elements, appState, files)}
        />
      </Suspense>
    </div>
  );
}
