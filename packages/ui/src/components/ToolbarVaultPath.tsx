import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { isTauri, TauriFsAdapter } from "@boke/storage-adapters";
import {
  normalizeVaultPathInput,
  resolveVaultDisplayPath,
} from "../vault-path-utils.js";
import { useT } from "../i18n/index.js";
import { useAppStore } from "../store.js";
import { VaultPathPickButton } from "./VaultPathPickButton.js";

function VaultPathGroup({ children }: { children: ReactNode }) {
  const setStatusText = useAppStore((s) => s.setStatusText);
  return (
    <div className="boke-toolbar-path-group">
      {children}
      <VaultPathPickButton
        className="boke-toolbar-path-reveal"
        onError={setStatusText}
      />
    </div>
  );
}

export function ToolbarVaultPath() {
  const t = useT();
  const vaultKind = useAppStore((s) => s.vaultKind);
  const localVaultPath = useAppStore((s) => s.localVaultPath);
  const remoteConfig = useAppStore((s) => s.remoteConfig);
  const mountVault = useAppStore((s) => s.mountVault);
  const setStatusText = useAppStore((s) => s.setStatusText);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);

  const displayPath = resolveVaultDisplayPath(localVaultPath, vaultKind);

  useEffect(() => {
    if (!editing) return;
    setDraft(displayPath);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [editing, displayPath]);

  const commit = useCallback(async () => {
    if (committingRef.current) return;
    committingRef.current = true;
    setEditing(false);

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
      setStatusText(t("status.vaultPathInvalid"));
    } finally {
      committingRef.current = false;
    }
  }, [draft, localVaultPath, mountVault, setStatusText, t]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    } else if (e.key === "Escape") {
      setEditing(false);
      setDraft(displayPath);
    }
  };

  if (vaultKind === "remote" && remoteConfig) {
    const remotePath = remoteConfig.vaultPath ?? "default";
    return (
      <span className="boke-toolbar-path boke-toolbar-path--readonly" title={remotePath}>
        {remotePath}
      </span>
    );
  }

  if (vaultKind !== "tauri" || !isTauri() || !displayPath) {
    return null;
  }

  if (editing) {
    return (
      <VaultPathGroup>
        <input
          ref={inputRef}
          className="boke-toolbar-path-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={onKeyDown}
          spellCheck={false}
          aria-label={t("toolbar.vaultPathAria")}
        />
      </VaultPathGroup>
    );
  }

  return (
    <VaultPathGroup>
      <span
        className="boke-toolbar-path"
        title={t("toolbar.vaultPathHint", { path: displayPath })}
        onClick={() => setEditing(true)}
      >
        {displayPath}
      </span>
    </VaultPathGroup>
  );
}
