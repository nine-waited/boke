import { useSyncExternalStore, useEffect, useRef, lazy, Suspense } from "react";
import { isTauri, TauriFsAdapter } from "@boke/storage-adapters";
import { TabBar } from "./components/TabBar.js";
import { FileTree } from "./components/FileTree.js";
import { SidebarNav } from "./components/SidebarNav.js";
import { NotePane, ModeToggle } from "./components/NotePane.js";
import { GraphView } from "./components/GraphView.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { PublishPanel } from "./components/PublishPanel.js";
import { CommandPalette } from "./components/CommandPalette.js";
import { SearchPanel } from "./components/SearchPanel.js";
import { GlobalKeyboardShortcuts } from "./components/GlobalKeyboardShortcuts.js";
import { ToolbarVaultPath } from "./components/ToolbarVaultPath.js";
import { formatShortcutLabel } from "./keyboard-shortcuts.js";
import {
  useAppStore,
  workspaceStore,
  vaultService,
  commandRegistry,
} from "./store.js";
import { registerCoreCommands } from "./commands.js";
import { createAndOpenNote } from "./note-actions.js";

const ExcalidrawView = lazy(() =>
  import("./components/ExcalidrawView.js").then((m) => ({ default: m.ExcalidrawView })),
);

let commandsRegistered = false;

function EditorContent() {
  const state = useSyncExternalStore(
    (cb) => workspaceStore.subscribe(cb),
    () => workspaceStore.getState(),
  );
  const vaultMounted = useAppStore((s) => s.vaultMounted);

  if (!vaultMounted) {
    return <div className="boke-vault-loading">正在打开知识库…</div>;
  }

  const active = state.active;
  if (!active || active.type === "empty") {
    return (
      <div className="boke-welcome">
        <p>Select a file or create a new note.</p>
        <button onClick={() => createAndOpenNote()}>New note</button>
      </div>
    );
  }

  switch (active.type) {
    case "markdown":
      return (
        <div className="boke-markdown-shell">
          {active.path && <ModeToggle leafId={active.id} mode={active.mode ?? "live"} />}
          {active.path && (
            <NotePane path={active.path} mode={active.mode ?? "live"} leafId={active.id} />
          )}
        </div>
      );
    case "excalidraw":
      return active.path ? (
        <Suspense fallback={<div style={{ padding: 24 }}>Loading drawing…</div>}>
          <ExcalidrawView path={active.path} />
        </Suspense>
      ) : null;
    case "graph":
      return <GraphView />;
    case "settings":
      return <SettingsPanel />;
    case "publish":
      return <PublishPanel />;
    default:
      return null;
  }
}

export function App() {
  const vaultMounted = useAppStore((s) => s.vaultMounted);
  const mountVault = useAppStore((s) => s.mountVault);
  const localVaultPath = useAppStore((s) => s.localVaultPath);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const statusText = useAppStore((s) => s.statusText);
  const keyboardShortcuts = useAppStore((s) => s.keyboardShortcuts);
  const autoMountStarted = useRef(false);

  useEffect(() => {
    if (!commandsRegistered) {
      registerCoreCommands();
      commandsRegistered = true;
    }
  }, []);

  useEffect(() => {
    if (!isTauri() || vaultMounted || autoMountStarted.current) return;
    autoMountStarted.current = true;
    (async () => {
      try {
        const adapter = localVaultPath
          ? new TauriFsAdapter(localVaultPath)
          : await TauriFsAdapter.default();
        await mountVault(adapter);
      } catch (err) {
        console.error("Failed to open default vault:", err);
        autoMountStarted.current = false;
      }
    })();
  }, [vaultMounted, localVaultPath, mountVault]);

  return (
    <div className="boke-app">
      <div className="boke-toolbar">
        <span className="boke-toolbar-brand">Boke</span>
        <ToolbarVaultPath />
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setCommandPaletteOpen(true)}
          title={formatShortcutLabel(keyboardShortcuts["quick-open"])}
        >
          Quick open
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          title={formatShortcutLabel(keyboardShortcuts.search)}
        >
          Search
        </button>
        <button onClick={() => commandRegistry.run("boke:open-settings")}>Settings</button>
      </div>

      <div className="boke-main">
        {vaultMounted && (
          <aside className="boke-sidebar">
            <SidebarNav />
            <div className="boke-sidebar-content">
              <FileTree />
            </div>
          </aside>
        )}

        <div className="boke-editor-area">
          {vaultMounted && <TabBar />}
          <div className="boke-content">
            <EditorContent />
          </div>
        </div>
      </div>

      <div className="boke-statusbar">{statusText || "Ready"}</div>

      <CommandPalette />
      <SearchPanel />
      <GlobalKeyboardShortcuts />
    </div>
  );
}

export { useAppStore, vaultService, workspaceStore, commandRegistry } from "./store.js";
