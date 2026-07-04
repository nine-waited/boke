import { CopyIcon } from "../icons/toolbar-icons.js";
import { useT } from "../i18n/index.js";
import { copyButtonStyle } from "../toolbar-path-layout.js";
import { useAppStore } from "../store.js";

export function VaultPathCopyButton({
  className,
  path,
}: {
  className: string;
  path: string;
}) {
  const t = useT();
  const setStatusText = useAppStore((s) => s.setStatusText);

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(path);
      setStatusText(t("status.vaultPathCopied"));
    } catch (err) {
      console.error("[Chestnut] copy vault path failed:", err);
      setStatusText(t("status.copyFailed"));
    }
  };

  return (
    <button
      type="button"
      className={className}
      style={copyButtonStyle()}
      title={t("toolbar.copyVaultPath")}
      aria-label={t("toolbar.copyVaultPathAria")}
      onClick={(e) => {
        e.stopPropagation();
        void copyPath();
      }}
    >
      <CopyIcon />
    </button>
  );
}
