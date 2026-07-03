import { useState } from "react";
import { LOCALES, useT } from "../i18n/index.js";
import { useAppStore } from "../store.js";
import type { Locale } from "../i18n/index.js";
import { SettingsLocalVaultPath } from "./SettingsLocalVaultPath.js";
import { SettingsKeyboardShortcuts } from "./SettingsKeyboardShortcuts.js";

export function SettingsPanel() {
  const t = useT();
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute("data-theme") ?? "light");

  const applyTheme = (next: string) => {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <div className="boke-settings">
      <h2>{t("settings.title")}</h2>

      <h3>{t("settings.language")}</h3>
      <p style={{ color: "var(--boke-text-muted)", fontSize: 13 }}>{t("settings.languageHint")}</p>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t("settings.language")}
      >
        {LOCALES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <h3>{t("settings.localStorage")}</h3>
      <p style={{ color: "var(--boke-text-muted)", fontSize: 13 }}>{t("settings.localStorageHint")}</p>
      <SettingsLocalVaultPath />

      <h3>{t("settings.shortcuts")}</h3>
      <p style={{ color: "var(--boke-text-muted)", fontSize: 13 }}>{t("settings.shortcutsHint")}</p>
      <SettingsKeyboardShortcuts />

      <h3>{t("settings.theme")}</h3>
      <select value={theme} onChange={(e) => applyTheme(e.target.value)}>
        <option value="light">{t("settings.themeLight")}</option>
        <option value="dark">{t("settings.themeDark")}</option>
      </select>
    </div>
  );
}
