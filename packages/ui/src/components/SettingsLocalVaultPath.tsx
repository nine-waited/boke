import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { isTauri, TauriFsAdapter } from "@boke/storage-adapters";
import {
  normalizeVaultPathInput,
  resolveVaultDisplayPath,
} from "../vault-path-utils.js";
import { useAppStore } from "../store.js";
import { VaultPathPickButton } from "./VaultPathPickButton.js";

export function SettingsLocalVaultPath() {
  const vaultKind = useAppStore((s) => s.vaultKind);
  const localVaultPath = useAppStore((s) => s.localVaultPath);
  const mountVault = useAppStore((s) => s.mountVault);
  const setStatusText = useAppStore((s) => s.setStatusText);

  const displayPath = resolveVaultDisplayPath(localVaultPath, vaultKind);
  const [draft, setDraft] = useState(displayPath);
  const committingRef = useRef(false);

  useEffect(() => {
    setDraft(displayPath);
  }, [displayPath]);

  const commit = useCallback(async () => {
    if (committingRef.current) return;
    committingRef.current = true;

    try {
      const trimmed = draft.trim();
      if (!trimmed) {
        await mountVault(await TauriFsAdapter.default());
        return;
      }

      const normalized = normalizeVaultPathInput(trimmed);
      const current = localVaultPath ? normalizeVaultPathInput(localVaultPath) : "";
      if (normalized === current) return;

      await mountVault(await TauriFsAdapter.open(normalized));
    } catch (err) {
      console.error("[boke] vault path change failed:", err);
      setStatusText("无法切换到该路径，请检查路径是否有效。");
      setDraft(displayPath);
    } finally {
      committingRef.current = false;
    }
  }, [draft, displayPath, localVaultPath, mountVault, setStatusText]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    } else if (e.key === "Escape") {
      setDraft(displayPath);
      e.currentTarget.blur();
    }
  };

  if (!isTauri()) {
    return (
      <p style={{ color: "var(--boke-text-muted)", fontSize: 13 }}>
        本地文件夹存储仅在桌面版可用。
      </p>
    );
  }

  return (
    <div className="boke-settings-vault-path-row">
      <input
        className="boke-settings-vault-path-input"
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={onKeyDown}
        spellCheck={false}
        aria-label="本地知识库存储路径"
        placeholder="选择或输入文件夹路径"
      />
      <VaultPathPickButton
        className="boke-settings-vault-path-pick"
        onError={setStatusText}
      />
    </div>
  );
}
