import { useSyncExternalStore, useEffect, useRef, lazy, Suspense, type CSSProperties } from "react";
import { isTauri, TauriFsAdapter } from "@boke/storage-adapters";
import { TabBar } from "./components/TabBar.js";
import { FileTree } from "./components/FileTree.js";
import { FileTreeExpandProvider } from "./file-tree-expand-context.js";
import { SidebarNav } from "./components/SidebarNav.js";
import { SidebarBoundaryControl } from "./components/SidebarBoundaryControl.js";
import { NotePane } from "./components/NotePane.js";
import { ImageView } from "./components/ImageView.js";
import { PdfView } from "./components/PdfView.js";
import { GraphView } from "./components/GraphView.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { PublishPanel } from "./components/PublishPanel.js";
import { CommandPalette } from "./components/CommandPalette.js";
import { SearchPanel } from "./components/SearchPanel.js";
import { GlobalKeyboardShortcuts } from "./components/GlobalKeyboardShortcuts.js";
import { ToolbarVaultPath } from "./components/ToolbarVaultPath.js";
import { ToolbarIconButton } from "./components/ToolbarIconButton.js";
import { QuickOpenIcon, SearchIcon, SettingsIcon } from "./icons/toolbar-icons.js";
import { formatShortcutLabel } from "./keyboard-shortcuts.js";
import { useT } from "./i18n/index.js";
import {
  useAppStore,
  workspaceStore,
  vaultService,
  commandRegistry,
} from "./store.js";
import { registerCoreCommands } from "./commands.js";
import { ConfirmDialogHost } from "./confirm-dialog.js";
import { PdfExportProgressHost } from "./pdf-export-progress.js";
import { createAndOpenNote } from "./note-actions.js";

const ExcalidrawView = lazy(() =>
  import("./components/ExcalidrawView.js").then((m) => ({ default: m.ExcalidrawView })),
);

let commandsRegistered = false;

function EditorContent() {
  const t = useT();
  const state = useSyncExternalStore(
    (cb) => workspaceStore.subscribe(cb),
    () => workspaceStore.getState(),
  );
  const vaultMounted = useAppStore((s) => s.vaultMounted);

  if (!vaultMounted) {
    return <div className="boke-vault-loading">{t("vault.loading")}</div>;
  }

  const active = state.active;
  if (!active || active.type === "empty") {
    return (
      <div className="boke-welcome">
        <p>{t("welcome.hint")}</p>
        <button onClick={() => createAndOpenNote()}>{t("welcome.newNote")}</button>
      </div>
    );
  }

  switch (active.type) {
    case "markdown":
      return (
        <div className="boke-markdown-shell">
          {active.path && (
            <NotePane path={active.path} mode={active.mode ?? "live"} leafId={active.id} />
          )}
        </div>
      );
    case "excalidraw":
      return active.path ? (
        <Suspense fallback={<div style={{ padding: 24 }}>{t("excalidraw.loadingApp")}</div>}>
          <ExcalidrawView path={active.path} />
        </Suspense>
      ) : null;
    case "image":
      return active.path ? <ImageView path={active.path} /> : null;
    case "pdf":
      return active.path ? <PdfView path={active.path} /> : null;
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
  const t = useT();
  const vaultMounted = useAppStore((s) => s.vaultMounted);
  const locale = useAppStore((s) => s.locale);
  const mountVault = useAppStore((s) => s.mountVault);
  const localVaultPath = useAppStore((s) => s.localVaultPath);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const statusText = useAppStore((s) => s.statusText);
  const keyboardShortcuts = useAppStore((s) => s.keyboardShortcuts);
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarWidth = useAppStore((s) => s.setSidebarWidth);
  const toggleSidebarCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);
  const autoMountStarted = useRef(false);

  useEffect(() => {
    if (!commandsRegistered) {
      registerCoreCommands();
      commandsRegistered = true;
    }
  }, []);

  useEffect(() => {
    registerCoreCommands();
  }, [locale]);

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
    <div
      className={`boke-app${sidebarCollapsed ? " boke-app--sidebar-collapsed" : ""}`}
      style={
        {
          "--boke-sidebar-width": sidebarCollapsed ? "0px" : `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <div className={`boke-toolbar${vaultMounted ? " boke-toolbar--vault-mounted" : ""}`}>
        <div className="boke-toolbar-side">
          <div className="boke-toolbar-leading">
            <span className="boke-toolbar-brand">Boke</span>
            <ToolbarVaultPath />
          </div>
        </div>
        <div className="boke-toolbar-center">
          <div className="boke-toolbar-actions">
            <ToolbarIconButton
              label={t("toolbar.quickOpenTooltip", {
                shortcut: formatShortcutLabel(keyboardShortcuts["quick-open"]),
              })}
              onClick={() => setCommandPaletteOpen(true)}
            >
              <QuickOpenIcon />
            </ToolbarIconButton>
            <ToolbarIconButton
              label={t("toolbar.searchTooltip", {
                shortcut: formatShortcutLabel(keyboardShortcuts.search),
              })}
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon />
            </ToolbarIconButton>
            <ToolbarIconButton
              label={t("toolbar.settingsTooltip")}
              onClick={() => commandRegistry.run("boke:open-settings")}
            >
              <SettingsIcon />
            </ToolbarIconButton>
          </div>
        </div>
      </div>

      <div className="boke-main">
        {vaultMounted && (
          <div className={`boke-sidebar-shell${sidebarCollapsed ? " is-collapsed" : ""}`}>
            <div className="boke-sidebar-panel">
              <aside className="boke-sidebar">
                <FileTreeExpandProvider>
                  <SidebarNav />
                  <div className="boke-sidebar-content">
                    <FileTree />
                  </div>
                </FileTreeExpandProvider>
              </aside>
            </div>
            <SidebarBoundaryControl
              collapsed={sidebarCollapsed}
              width={sidebarWidth}
              onWidthChange={setSidebarWidth}
              onToggleCollapsed={toggleSidebarCollapsed}
            />
          </div>
        )}

        <div className="boke-editor-area">
          {vaultMounted && <TabBar />}
          <div className="boke-content" tabIndex={-1}>
            <EditorContent />
          </div>
        </div>
      </div>

      <div className="boke-statusbar">{statusText || t("status.ready")}</div>

      <CommandPalette />
      <SearchPanel />
      <ConfirmDialogHost />
      <PdfExportProgressHost />
      <GlobalKeyboardShortcuts />
    </div>
  );
}

export { useAppStore, vaultService, workspaceStore, commandRegistry } from "./store.js";
