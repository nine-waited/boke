import { useSyncExternalStore } from "react";
import { SplitViewIcon } from "../icons/toolbar-icons.js";
import { useT } from "../i18n/index.js";
import { useAppStore, workspaceStore } from "../store.js";
import { ToolbarIconButton } from "./ToolbarIconButton.js";

export function ToolbarSplitButton() {
  const t = useT();
  const syncOutlineDefaultsForSplit = useAppStore((s) => s.syncOutlineDefaultsForSplit);
  const split = useSyncExternalStore(
    (cb) => workspaceStore.subscribe(cb),
    () => workspaceStore.getState().split,
  );

  return (
    <ToolbarIconButton
      label={split ? t("toolbar.splitOnTooltip") : t("toolbar.splitOffTooltip")}
      pressed={split}
      onClick={() => {
        workspaceStore.toggleSplit();
        syncOutlineDefaultsForSplit(workspaceStore.isSplit());
      }}
    >
      <SplitViewIcon />
    </ToolbarIconButton>
  );
}
