import { useEffect, useState } from "react";
import {
  FileSystemAccessAdapter,
  isFsaSupported,
  isTauri,
  OpfsAdapter,
  RemoteRestAdapter,
  saveRemoteConfig,
  TauriFsAdapter,
} from "@boke/storage-adapters";
import { pluginHost, useAppStore, vaultService } from "../store.js";

export function SettingsPanel() {
  const remoteConfig = useAppStore((s) => s.remoteConfig);
  const setRemoteConfig = useAppStore((s) => s.setRemoteConfig);
  const enabledPlugins = useAppStore((s) => s.enabledPlugins);
  const setEnabledPlugins = useAppStore((s) => s.setEnabledPlugins);
  const mountVault = useAppStore((s) => s.mountVault);
  const vaultKind = useAppStore((s) => s.vaultKind);

  const [baseUrl, setBaseUrl] = useState(remoteConfig?.baseUrl ?? "");
  const [token, setToken] = useState(remoteConfig?.token ?? "");
  const [vaultPath, setVaultPath] = useState(remoteConfig?.vaultPath ?? "default");
  const [plugins, setPlugins] = useState<Array<{ id: string; name: string }>>([]);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute("data-theme") ?? "light");

  useEffect(() => {
    const load = async () => {
      const adapter = vaultService.getAdapter();
      if (!adapter) {
        setPlugins([]);
        return;
      }
      try {
        await adapter.mkdir(".boke/plugins");
        const entries = await adapter.list(".boke/plugins");
        const list: Array<{ id: string; name: string }> = [];
        for (const e of entries) {
          if (e.kind !== "directory") continue;
          try {
            const raw = await adapter.read(`.boke/plugins/${e.name}/manifest.json`);
            const m = JSON.parse(raw) as { id: string; name: string };
            list.push({ id: m.id, name: m.name });
          } catch {
            /* skip invalid plugin */
          }
        }
        setPlugins(list);
      } catch {
        setPlugins([]);
      }
    };
    load();
  }, [vaultKind]);

  const connectRemote = async () => {
    const config = { baseUrl, token, vaultPath };
    setRemoteConfig(config);
    saveRemoteConfig(config);
    const adapter = new RemoteRestAdapter(config);
    await mountVault(adapter);
  };

  const switchLocalFsa = async () => {
    if (!isFsaSupported()) {
      alert("File System Access API not supported. Use Tauri desktop or OPFS.");
      return;
    }
    const adapter = await FileSystemAccessAdapter.pick();
    useAppStore.getState().setLastFsaVaultId(adapter.id);
    await mountVault(adapter);
  };

  const switchLocalOpfs = async () => {
    await mountVault(new OpfsAdapter());
  };

  const switchTauri = async () => {
    if (!isTauri()) {
      alert("Tauri is only available in the desktop app.");
      return;
    }
    const adapter = await TauriFsAdapter.pick();
    await mountVault(adapter);
  };

  const togglePlugin = async (id: string) => {
    const next = enabledPlugins.includes(id)
      ? enabledPlugins.filter((p) => p !== id)
      : [...enabledPlugins, id];
    setEnabledPlugins(next);
    if (enabledPlugins.includes(id)) {
      await pluginHost.disable(id);
    } else {
      const adapter = vaultService.getAdapter();
      if (adapter) {
        try {
          const raw = await adapter.read(`.boke/plugins/${id}/manifest.json`);
          const manifest = JSON.parse(raw) as import("@boke/plugin-sdk").PluginManifest;
          await pluginHost.enable(id, manifest);
        } catch (err) {
          console.warn(err);
        }
      }
    }
  };

  const applyTheme = (t: string) => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  };

  return (
    <div className="boke-settings">
      <h2>Settings</h2>

      <h3>Storage</h3>
      <p style={{ color: "var(--boke-text-muted)", fontSize: 13 }}>
        Current: {vaultKind || "none"}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {isTauri() && <button onClick={switchTauri}>Open folder (Tauri)</button>}
        {isFsaSupported() && <button onClick={switchLocalFsa}>Open folder (Browser)</button>}
        <button onClick={switchLocalOpfs}>Use browser sandbox (OPFS)</button>
      </div>

      <h3>Remote server</h3>
      <label>Base URL</label>
      <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://boke.example.com" />
      <label>Token</label>
      <input value={token} onChange={(e) => setToken(e.target.value)} type="password" />
      <label>Vault path</label>
      <input value={vaultPath} onChange={(e) => setVaultPath(e.target.value)} />
      <button style={{ marginTop: 12 }} onClick={connectRemote}>
        Connect remote vault
      </button>

      <h3>Theme</h3>
      <select value={theme} onChange={(e) => applyTheme(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>

      <h3>Plugins</h3>
      {plugins.length === 0 ? (
        <p style={{ color: "var(--boke-text-muted)", fontSize: 13 }}>
          Install plugins under <code>.boke/plugins/</code> in your vault.
        </p>
      ) : (
        plugins.map((p) => (
          <label key={p.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={enabledPlugins.includes(p.id)}
              onChange={() => togglePlugin(p.id)}
            />
            {p.name} ({p.id})
          </label>
        ))
      )}
    </div>
  );
}
