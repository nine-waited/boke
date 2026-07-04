import { TauriFsAdapter } from "@chestnut/storage-adapters";
import { FolderToolbarIcon } from "../icons/sidebar-icons.js";
import { useT } from "../i18n/index.js";
import { isPickCancelled, resolveVaultDisplayPath } from "../vault-path-utils.js";
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
  const localVaultPath = useAppStore((s) => s.localVaultPath);
  const vaultKind = useAppStore((s) => s.vaultKind);

  const pickFolder = async () => {
    try {
      const defaultPath = resolveVaultDisplayPath(localVaultPath, vaultKind);
      const adapter = await TauriFsAdapter.pick(defaultPath || undefined);
      await mountVault(adapter);
    } catch (err) {
      if (isPickCancelled(err)) return;
      console.error("[Chestnut] pick vault folder failed:", err);
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
