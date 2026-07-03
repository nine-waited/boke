import { create } from "zustand";
import { useT } from "./i18n/index.js";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions | null;
  resolve: ((confirmed: boolean) => void) | null;
}

interface ConfirmStore extends ConfirmState {
  ask: (options: ConfirmOptions) => Promise<boolean>;
  answer: (confirmed: boolean) => void;
}

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  ask: (options) =>
    new Promise((resolve) => {
      set({ open: true, options, resolve });
    }),
  answer: (confirmed) => {
    const { resolve } = get();
    resolve?.(confirmed);
    set({ open: false, options: null, resolve: null });
  },
}));

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().ask(options);
}

export function ConfirmDialogHost() {
  const open = useConfirmStore((s) => s.open);
  const options = useConfirmStore((s) => s.options);
  const answer = useConfirmStore((s) => s.answer);
  const t = useT();

  if (!open || !options) return null;

  const confirmLabel = options.confirmLabel ?? t("common.confirm");
  const cancelLabel = options.cancelLabel ?? t("common.cancel");

  return (
    <div
      className="boke-modal-overlay boke-confirm-overlay"
      onClick={() => answer(false)}
    >
      <div
        className="boke-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="boke-confirm-title"
        aria-describedby="boke-confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="boke-confirm-title">{options.title}</h2>
        <p id="boke-confirm-message">{options.message}</p>
        <div className="boke-confirm-actions">
          <button type="button" onClick={() => answer(false)}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={options.danger ? "boke-confirm-danger" : undefined}
            autoFocus
            onClick={() => answer(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
