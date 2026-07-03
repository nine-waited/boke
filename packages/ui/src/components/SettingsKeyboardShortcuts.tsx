import { useState } from "react";
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_IDS,
  normalizeShortcut,
  type ShortcutId,
} from "../keyboard-shortcuts.js";
import { getShortcutLabel, useT } from "../i18n/index.js";
import { useAppStore } from "../store.js";

export function SettingsKeyboardShortcuts() {
  const t = useT();
  const locale = useAppStore((s) => s.locale);
  const keyboardShortcuts = useAppStore((s) => s.keyboardShortcuts);
  const setKeyboardShortcut = useAppStore((s) => s.setKeyboardShortcut);
  const resetKeyboardShortcuts = useAppStore((s) => s.resetKeyboardShortcuts);
  const [drafts, setDrafts] = useState(keyboardShortcuts);

  const commit = (id: ShortcutId, value: string) => {
    const normalized = normalizeShortcut(value);
    setDrafts((prev) => ({ ...prev, [id]: normalized }));
    setKeyboardShortcut(id, normalized);
  };

  return (
    <div className="boke-settings-shortcuts">
      {SHORTCUT_IDS.map((id) => (
        <div key={id} className="boke-settings-shortcut-row">
          <label htmlFor={`shortcut-${id}`}>{getShortcutLabel(id, locale)}</label>
          <input
            id={`shortcut-${id}`}
            className="boke-settings-shortcut-input"
            value={drafts[id]}
            onChange={(e) => setDrafts((prev) => ({ ...prev, [id]: e.target.value }))}
            onBlur={(e) => commit(id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(id, e.currentTarget.value);
                e.currentTarget.blur();
              }
            }}
            spellCheck={false}
            placeholder={DEFAULT_SHORTCUTS[id]}
            data-boke-shortcut-ignore
          />
        </div>
      ))}
      <button
        type="button"
        className="boke-settings-shortcuts-reset"
        onClick={() => {
          resetKeyboardShortcuts();
          setDrafts({ ...DEFAULT_SHORTCUTS });
        }}
      >
        {t("settings.shortcutsReset")}
      </button>
    </div>
  );
}
