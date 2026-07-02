import { RemoteRestAdapter, TauriFsAdapter } from "@boke/storage-adapters";
import { useAppStore } from "../store.js";

export function WelcomeScreen() {
  const mountVault = useAppStore((s) => s.mountVault);
  const remoteConfig = useAppStore((s) => s.remoteConfig);

  const openLocal = async () => {
    const adapter = await TauriFsAdapter.pick();
    await mountVault(adapter);
  };

  const openRemote = async () => {
    if (!remoteConfig?.baseUrl || !remoteConfig?.token) {
      alert("请先在设置中配置云端存储（REST API）。");
      return;
    }
    await mountVault(new RemoteRestAdapter(remoteConfig));
  };

  return (
    <div className="boke-welcome">
      <h1>Boke — Knowledge Manager</h1>
      <p>本地 Markdown + Excalidraw 知识库 · 桌面优先</p>
      <div className="boke-welcome-actions">
        <button onClick={openLocal}>打开本地文件夹</button>
        <button onClick={openRemote} disabled={!remoteConfig?.baseUrl || !remoteConfig?.token}>
          连接云端存储
        </button>
      </div>
      <p style={{ fontSize: 12, maxWidth: 480, textAlign: "center" }}>
        笔记以纯 Markdown 文件保存在本地文件夹，或通过 REST API 连接云端 vault。
        在设置中配置 Base URL、Token 与 Vault 路径。
      </p>
    </div>
  );
}
