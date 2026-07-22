import { useState } from "react";
import { isTauri } from "@chestnut/storage-adapters";
import { AlwaysOnTopIcon } from "../icons/toolbar-icons.js";
import { useT } from "../i18n/index.js";
import { useAppStore } from "../store.js";
import { ToolbarIconButton } from "./ToolbarIconButton.js";

async function setWindowAlwaysOnTop(enabled: boolean): Promise<void> {
  const { getCurrentWindow } = await import(/* @vite-ignore */ "@tauri-apps/api/window");
  await getCurrentWindow().setAlwaysOnTop(enabled);
}

export function ToolbarAlwaysOnTopButton() {
  const t = useT();
  const setStatusText = useAppStore((s) => s.setStatusText);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!isTauri()) return null;

  const label = alwaysOnTop
    ? t("toolbar.alwaysOnTopOnTooltip")
    : t("toolbar.alwaysOnTopOffTooltip");

  return (
    <ToolbarIconButton
      label={label}
      pressed={alwaysOnTop}
      onClick={() => {
        if (busy) return;
        const next = !alwaysOnTop;
        setBusy(true);
        void setWindowAlwaysOnTop(next)
          .then(() => {
            setAlwaysOnTop(next);
          })
          .catch((err) => {
            console.error("[Chestnut] setAlwaysOnTop failed:", err);
            setStatusText(t("status.alwaysOnTopFailed"));
          })
          .finally(() => {
            setBusy(false);
          });
      }}
    >
      <AlwaysOnTopIcon slashed={!alwaysOnTop} />
    </ToolbarIconButton>
  );
}
