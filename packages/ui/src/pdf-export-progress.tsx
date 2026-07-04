import { create } from "zustand";
import { useT } from "./i18n/index.js";

export type PdfExportPhase = "prepare" | "render" | "images" | "generate" | "save" | "done";

interface PdfExportProgressStore {
  open: boolean;
  fileName: string;
  progress: number;
  phase: PdfExportPhase;
  ticker: ReturnType<typeof setInterval> | null;
  start: (fileName: string) => void;
  setProgress: (progress: number, phase: PdfExportPhase) => void;
  startGeneratingTicker: () => void;
  stopTicker: () => void;
  finishSuccess: () => Promise<void>;
  fail: () => void;
}

export const usePdfExportProgressStore = create<PdfExportProgressStore>((set, get) => ({
  open: false,
  fileName: "",
  progress: 0,
  phase: "prepare",
  ticker: null,

  start(fileName) {
    get().stopTicker();
    set({ open: true, fileName, progress: 0, phase: "prepare" });
  },

  setProgress(progress, phase) {
    set({ progress: Math.min(100, Math.max(0, progress)), phase });
  },

  startGeneratingTicker() {
    get().stopTicker();
    let value = 45;
    const ticker = setInterval(() => {
      value = Math.min(84, value + 1.4);
      set({ progress: value, phase: "generate" });
    }, 180);
    set({ ticker });
  },

  stopTicker() {
    const { ticker } = get();
    if (ticker) clearInterval(ticker);
    set({ ticker: null });
  },

  async finishSuccess() {
    get().stopTicker();
    set({ progress: 100, phase: "done" });
    await new Promise((resolve) => setTimeout(resolve, 480));
    set({ open: false, fileName: "", progress: 0, phase: "prepare" });
  },

  fail() {
    get().stopTicker();
    set({ open: false, fileName: "", progress: 0, phase: "prepare" });
  },
}));

const PHASE_KEYS: Record<PdfExportPhase, string> = {
  prepare: "exportPdf.phasePrepare",
  render: "exportPdf.phaseRender",
  images: "exportPdf.phaseImages",
  generate: "exportPdf.phaseGenerate",
  save: "exportPdf.phaseSave",
  done: "exportPdf.phaseDone",
};

export function PdfExportProgressHost() {
  const open = usePdfExportProgressStore((s) => s.open);
  const fileName = usePdfExportProgressStore((s) => s.fileName);
  const progress = usePdfExportProgressStore((s) => s.progress);
  const phase = usePdfExportProgressStore((s) => s.phase);
  const t = useT();

  if (!open) return null;

  return (
    <div className="boke-modal-overlay boke-confirm-overlay boke-pdf-export-overlay" aria-hidden="false">
      <div
        className="boke-pdf-export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="boke-pdf-export-title"
        aria-describedby="boke-pdf-export-status"
      >
        <h2 id="boke-pdf-export-title">{t("exportPdf.title")}</h2>
        <p className="boke-pdf-export-file" title={fileName}>
          {fileName}
        </p>
        <div className="boke-pdf-export-bar" aria-hidden="true">
          <div className="boke-pdf-export-bar__fill" style={{ width: `${progress}%` }} />
        </div>
        <p id="boke-pdf-export-status" className="boke-pdf-export-status">
          {t(PHASE_KEYS[phase])} · {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}
