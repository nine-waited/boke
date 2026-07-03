import { useState } from "react";
import { useAppStore } from "../store.js";
import { SettingsLocalVaultPath } from "./SettingsLocalVaultPath.js";
import { SettingsKeyboardShortcuts } from "./SettingsKeyboardShortcuts.js";

export function SettingsPanel() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute("data-theme") ?? "light");

  const applyTheme = (t: string) => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  };

  return (
    <div className="boke-settings">
      <h2>Settings</h2>

      <h3>本地存储</h3>
      <p style={{ color: "var(--boke-text-muted)", fontSize: 13 }}>
        笔记保存在本地文件夹，可直接编辑路径或点击右侧图标选择文件夹。
      </p>
      <SettingsLocalVaultPath />

      <h3>快捷键</h3>
      <p style={{ color: "var(--boke-text-muted)", fontSize: 13 }}>
        使用类似 Ctrl+Shift+F、Shift+Shift（双击 Shift）的格式，修改后按 Enter 或点击其他区域保存。
      </p>
      <SettingsKeyboardShortcuts />

      <h3>Theme</h3>
      <select value={theme} onChange={(e) => applyTheme(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
