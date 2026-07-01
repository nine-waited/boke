import {
  FileSystemAccessAdapter,
  isFsaSupported,
  isTauri,
  OpfsAdapter,
  RemoteRestAdapter,
  loadRemoteConfig,
  TauriFsAdapter,
} from "@boke/storage-adapters";
import { useAppStore } from "../store.js";

export function WelcomeScreen() {
  const mountVault = useAppStore((s) => s.mountVault);
  const lastFsaVaultId = useAppStore((s) => s.lastFsaVaultId);
  const setLastFsaVaultId = useAppStore((s) => s.setLastFsaVaultId);

  const openTauri = async () => {
    const adapter = await TauriFsAdapter.pick();
    await mountVault(adapter);
  };

  const openFsa = async () => {
    if (lastFsaVaultId) {
      const restored = await FileSystemAccessAdapter.restore(lastFsaVaultId);
      if (restored) {
        await mountVault(restored);
        return;
      }
    }
    const adapter = await FileSystemAccessAdapter.pick();
    setLastFsaVaultId(adapter.id);
    await mountVault(adapter);
  };

  const openOpfs = async () => {
    const adapter = new OpfsAdapter();
    await mountVault(adapter);
    await adapter.mkdir("notes");
    await adapter.write(
      "notes/Welcome.md",
      `---
title: Welcome to Boke
tags: [boke, welcome]
created: ${new Date().toISOString().slice(0, 10)}
---

# Welcome

This is your **local-first** knowledge vault.

- Use \`[[wikilinks]]\` to connect notes
- Create \`.excalidraw\` drawings
- Drop images into notes (saved under \`attachments/\`)
- Press **Ctrl+P** to quick-open
`,
    );
  };

  const openRemote = async () => {
    const config = loadRemoteConfig();
    if (!config) {
      alert("Configure remote server in Settings first.");
      return;
    }
    await mountVault(new RemoteRestAdapter(config));
  };

  return (
    <div className="boke-welcome">
      <h1>Boke — Knowledge Manager</h1>
      <p>Local-first Markdown + Excalidraw · Extensible · Open Source</p>
      <div className="boke-welcome-actions">
        {isTauri() && <button onClick={openTauri}>Open vault folder (Desktop)</button>}
        {isFsaSupported() && <button onClick={openFsa}>Open vault folder (Browser)</button>}
        <button onClick={openOpfs}>Try sandbox vault (OPFS)</button>
        {loadRemoteConfig() && <button onClick={openRemote}>Connect remote vault</button>}
      </div>
      <p style={{ fontSize: 12, maxWidth: 480, textAlign: "center" }}>
        Your notes are plain Markdown files. Data stays in a folder you control.
        Install the desktop app for the best experience on all platforms.
      </p>
    </div>
  );
}
