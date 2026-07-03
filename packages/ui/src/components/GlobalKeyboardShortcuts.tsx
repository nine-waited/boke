import { useEffect, useRef } from "react";
import {
  DOUBLE_TAP_WINDOW_MS,
  isDoubleTapShortcut,
  matchesShortcut,
} from "../keyboard-shortcuts.js";
import { useAppStore } from "../store.js";

function isShortcutInputTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("[data-boke-shortcut-ignore]"));
}

export function GlobalKeyboardShortcuts() {
  const keyboardShortcuts = useAppStore((s) => s.keyboardShortcuts);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const lastShiftUpAt = useRef(0);

  useEffect(() => {
    const quickOpenShortcut = keyboardShortcuts["quick-open"];
    const useDoubleShift = isDoubleTapShortcut(quickOpenShortcut);

    const toggleQuickOpen = () => {
      const open = useAppStore.getState().commandPaletteOpen;
      setCommandPaletteOpen(!open);
    };

    const resetDoubleShift = () => {
      lastShiftUpAt.current = 0;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isShortcutInputTarget(event.target)) return;

      if (useDoubleShift && event.key !== "Shift") {
        resetDoubleShift();
      }

      if (!useDoubleShift && matchesShortcut(event, quickOpenShortcut)) {
        event.preventDefault();
        toggleQuickOpen();
        return;
      }

      if (matchesShortcut(event, keyboardShortcuts.search)) {
        event.preventDefault();
        const open = useAppStore.getState().searchOpen;
        setSearchOpen(!open);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!useDoubleShift || isShortcutInputTarget(event.target)) return;
      if (event.key !== "Shift" || event.ctrlKey || event.metaKey || event.altKey) return;

      const now = Date.now();
      if (lastShiftUpAt.current && now - lastShiftUpAt.current <= DOUBLE_TAP_WINDOW_MS) {
        event.preventDefault();
        resetDoubleShift();
        toggleQuickOpen();
        return;
      }

      lastShiftUpAt.current = now;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [keyboardShortcuts, setCommandPaletteOpen, setSearchOpen]);

  return null;
}
