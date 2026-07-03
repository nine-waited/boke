import { TauriFsAdapter } from "@boke/storage-adapters";
import { FolderToolbarIcon } from "../icons/sidebar-icons.js";
import { isPickCancelled } from "../vault-path-utils.js";
import { useAppStore } from "../store.js";

export function VaultPathPickButton({
  className,
  onError,
}: {
  className: string;
  onError: (msg: string) => void;
}) {
  const mountVault = useAppStore((s) => s.mountVault);

  const pickFolder = async () => {
    try {
      const adapter = await TauriFsAdapter.pick();
      await mountVault(adapter);
    } catch (err) {
      if (isPickCancelled(err)) return;
      console.error("[boke] pick vault folder failed:", err);
      onError("无法切换到所选文件夹。");
    }
  };

  return (
    <button
      type="button"
      className={className}
      title="选择文件夹"
      aria-label="选择文件夹并切换存储路径"
      onClick={(e) => {
        e.stopPropagation();
        void pickFolder();
      }}
    >
      <FolderToolbarIcon />
    </button>
  );
}
