import { useCallback } from "react";
import type { ShortcutId } from "../keyboard-shortcuts.js";
import { useAppStore } from "../store.js";
import {
  LOCALES,
  translate,
  type Locale,
} from "./messages.js";

export type { Locale };
export { LOCALES };

type Params = Record<string, string | number>;

export function useLocale(): Locale {
  return useAppStore((s) => s.locale);
}

export function useT() {
  const locale = useLocale();
  return useCallback((key: string, params?: Params) => translate(locale, key, params), [locale]);
}

export function getT(): (key: string, params?: Params) => string {
  const locale = useAppStore.getState().locale;
  return (key, params) => translate(locale, key, params);
}

export function getShortcutLabel(id: ShortcutId, locale: Locale): string {
  return translate(locale, `shortcuts.${id}`);
}

const UNTITLED_PATTERNS: Record<Locale, RegExp[]> = {
  en: [/^Untitled$/i, /^Untitled \d+$/i],
  "zh-CN": [/^Untitled$/i, /^Untitled \d+$/i, /^未命名$/i, /^未命名 \d+$/i],
};

export function isDefaultUntitledName(name: string, locale: Locale): boolean {
  return UNTITLED_PATTERNS[locale].some((pattern) => pattern.test(name.trim()));
}

const DEFAULT_TITLES: Record<Locale, Record<"note" | "drawing" | "folder", string>> = {
  en: { note: "Untitled", drawing: "Drawing", folder: "New folder" },
  "zh-CN": { note: "未命名", drawing: "绘图", folder: "新建文件夹" },
};

export function getDefaultTitle(locale: Locale, kind: "note" | "drawing" | "folder"): string {
  return DEFAULT_TITLES[locale][kind];
}
