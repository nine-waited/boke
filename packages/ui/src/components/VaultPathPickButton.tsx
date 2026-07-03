import { TauriFsAdapter } from "@boke/storage-adapters";
import { FolderToolbarIcon } from "../icons/sidebar-icons.js";
import { useT } from "../i18n/index.js";
import { isPickCancelled } from "../vault-path-utils.js";
import { useAppStore } from "../store.js";

export function VaultPathPickButton({
  className,
  onError,
}: {
  className: string;
  onError: (msg: string) => void;
}) {
  const t = useT();
  const mountVault = useAppStore((s) => s.mountVault);

  const pickFolder = async () => {
    try {
      const adapter = await TauriFsAdapter.pick();
      await mountVault(adapter);
    } catch (err) {
      if (isPickCancelled(err)) return;
      console.error("[boke] pick vault folder failed:", err);
      onError(t("status.pickFolderFailed"));
    }
  };

  return (
    <button
      type="button"
      className={className}
      title={t("toolbar.pickFolder")}
      aria-label={t("toolbar.pickFolderAria")}
      onClick={(e) => {
        e.stopPropagation();
        void pickFolder();
      }}
    >
      <FolderToolbarIcon />
    </button>
  );
}
