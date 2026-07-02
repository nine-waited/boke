import { create } from "zustand";
import type { VaultAdapter } from "@boke/core";
import {
  commandRegistry,
  eventBus,
  metadataCache,
  searchIndex,
  vaultService,
  workspaceStore,
} from "@boke/core";
import type { PluginApi, PluginManifest } from "@boke/plugin-sdk";
import { APP_VERSION } from "@boke/plugin-sdk";
import { PluginHost } from "@boke/core";
import type { RemoteConfig } from "@boke/storage-adapters";

export interface AppState {
  vaultMounted: boolean;
  vaultName: string;
  vaultKind: string;
  treeVersion: number;
  commandPaletteOpen: boolean;
  searchOpen: boolean;
  sidebarTab: "files" | "backlinks" | "tags";
  enabledPlugins: string[];
  remoteConfig: RemoteConfig | null;
  statusText: string;
}

export interface AppActions {
  mountVault: (adapter: VaultAdapter) => Promise<void>;
  unmountVault: () => Promise<void>;
  refreshTree: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setSidebarTab: (tab: AppState["sidebarTab"]) => void;
  setEnabledPlugins: (ids: string[]) => void;
  setRemoteConfig: (config: RemoteConfig | null) => void;
  setStatusText: (text: string) => void;
}

const SETTINGS_KEY = "boke-app-settings";

function loadSettings(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as Partial<AppState>) : {};
  } catch {
    return {};
  }
}

function saveSettings(state: AppState): void {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      enabledPlugins: state.enabledPlugins,
      remoteConfig: state.remoteConfig,
    }),
  );
}

const pluginHost = new PluginHost({
  buildApi: (pluginId) => buildPluginApi(pluginId),
  readPluginModule: async (pluginId, main) => {
    const adapter = vaultService.getAdapter();
    if (!adapter) throw new Error("No vault");
    const code = await adapter.read(`.boke/plugins/${pluginId}/${main}`);
    const blob = new Blob([code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    try {
      const mod = await import(/* @vite-ignore */ url);
      return mod as import("@boke/plugin-sdk").PluginExports;
    } finally {
      URL.revokeObjectURL(url);
    }
  },
  listInstalledPlugins: async () => {
    const adapter = vaultService.getAdapter();
    if (!adapter) return [];
    try {
      const entries = await adapter.list(".boke/plugins");
      const manifests: PluginManifest[] = [];
      for (const e of entries) {
        if (e.kind !== "directory") continue;
        try {
          const raw = await adapter.read(`.boke/plugins/${e.name}/manifest.json`);
          manifests.push(JSON.parse(raw) as PluginManifest);
        } catch {
          /* skip */
        }
      }
      return manifests;
    } catch {
      return [];
    }
  },
  loadPluginData: async (pluginId) => {
    const adapter = vaultService.getAdapter();
    if (!adapter) return null;
    try {
      const raw = await adapter.read(`.boke/plugins/${pluginId}/data.json`);
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  savePluginData: async (pluginId, data) => {
    const adapter = vaultService.getAdapter();
    if (!adapter) return;
    await adapter.mkdir(`.boke/plugins/${pluginId}`);
    await adapter.write(`.boke/plugins/${pluginId}/data.json`, JSON.stringify(data, null, 2));
  },
});

function buildPluginApi(pluginId: string): PluginApi {
  const adapter = vaultService.getAdapter();
  return {
    commands: commandRegistry,
    workspace: {
      openFile: (path, opts) => workspaceStore.openFile(path, opts),
      openExcalidraw: (path, opts) => workspaceStore.openExcalidraw(path, opts),
      openGraph: (opts) => workspaceStore.openGraph(),
      openSettings: () => workspaceStore.openSettings(),
      getActivePath: () => workspaceStore.getActivePath(),
    },
    vault: {
      active: {
        id: adapter?.id ?? "",
        name: adapter?.name ?? "",
        kind: adapter?.kind ?? "tauri",
      },
      read: (path) => vaultService.read(path),
      write: (path, content) => vaultService.write(path, content, true),
      listMarkdown: () => vaultService.listMarkdown(),
      listAttachments: () => vaultService.listAttachments(),
    },
    metadataCache: {
      getFileCache: (path) => metadataCache.get(path),
      getBacklinks: (path) => metadataCache.getBacklinks(path),
      getAllTags: () => metadataCache.getAllTags(),
    },
    events: {
      on: (event, listener) => eventBus.on(event, listener),
    },
    statusBar: {
      add: (opts) => {
        useAppStore.getState().setStatusText(opts?.text ?? "");
        return {
          setText: (text) => useAppStore.getState().setStatusText(text),
          setTooltip: () => {},
          setOnClick: () => {},
          remove: () => useAppStore.getState().setStatusText(""),
        };
      },
    },
    boke: { version: APP_VERSION },
    loadData: () => pluginHost.loadData(pluginId) as Promise<null>,
    saveData: (data) => pluginHost.saveData(pluginId, data),
    addSettingsTab: () => () => {},
    log: (...args) => console.log(`[plugin:${pluginId}]`, ...args),
  };
}

const saved = loadSettings();

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  vaultMounted: false,
  vaultName: "",
  vaultKind: "",
  treeVersion: 0,
  commandPaletteOpen: false,
  searchOpen: false,
  sidebarTab: "files",
  enabledPlugins: saved.enabledPlugins ?? [],
  remoteConfig: saved.remoteConfig ?? null,
  statusText: "",

  mountVault: async (adapter) => {
    await vaultService.mount(adapter);
    const vaultAdapter = vaultService.getAdapter();
    for (const id of get().enabledPlugins) {
      try {
        if (vaultAdapter) {
          const raw = await vaultAdapter.read(`.boke/plugins/${id}/manifest.json`);
          const manifest = JSON.parse(raw) as import("@boke/plugin-sdk").PluginManifest;
          await pluginHost.enable(id, manifest);
        }
      } catch (err) {
        console.warn(`Failed to enable plugin ${id}:`, err);
      }
    }
    set({
      vaultMounted: true,
      vaultName: adapter.name,
      vaultKind: adapter.kind,
      treeVersion: get().treeVersion + 1,
    });
    saveSettings(get());
  },

  unmountVault: async () => {
    for (const id of pluginHost.getEnabledIds()) {
      await pluginHost.disable(id);
    }
    await vaultService.unmount();
    set({ vaultMounted: false, vaultName: "", vaultKind: "" });
  },

  refreshTree: () => set({ treeVersion: get().treeVersion + 1 }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setEnabledPlugins: (ids) => {
    set({ enabledPlugins: ids });
    saveSettings(get());
  },
  setRemoteConfig: (config) => {
    set({ remoteConfig: config });
    saveSettings(get());
  },
  setStatusText: (text) => set({ statusText: text }),
}));

export { pluginHost, commandRegistry, workspaceStore, vaultService, metadataCache, searchIndex, eventBus };
