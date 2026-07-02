import { useEffect, useState } from "react";
import { RemoteRestAdapter, TauriFsAdapter } from "@boke/storage-adapters";
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

  const saveCloudConfig = () => {
    const config = { baseUrl, token, vaultPath };
    setRemoteConfig(config);
  };

  const connectRemote = async () => {
    const config = { baseUrl, token, vaultPath };
    setRemoteConfig(config);
    await mountVault(new RemoteRestAdapter(config));
  };

  const switchLocal = async () => {
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

      <h3>本地存储</h3>
      <p style={{ color: "var(--boke-text-muted)", fontSize: 13 }}>
        当前：{vaultKind === "tauri" ? "本地文件夹" : vaultKind === "remote" ? "云端存储" : "未连接"}
      </p>
      <button onClick={switchLocal}>打开本地文件夹</button>

      <h3>云端存储（REST API）</h3>
      <p style={{ color: "var(--boke-text-muted)", fontSize: 13 }}>
        配置云端 vault 服务地址。服务端 API 规范见 <code>server/</code> 参考实现。
      </p>
      <label>Base URL</label>
      <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://boke.example.com" />
      <label>Token</label>
      <input value={token} onChange={(e) => setToken(e.target.value)} type="password" />
      <label>Vault path</label>
      <input value={vaultPath} onChange={(e) => setVaultPath(e.target.value)} />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={saveCloudConfig}>保存配置</button>
        <button onClick={connectRemote}>连接云端 vault</button>
      </div>

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
