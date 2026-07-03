export type ShortcutId = "quick-open" | "search";

export const SHORTCUT_IDS: ShortcutId[] = ["quick-open", "search"];

export const SHORTCUT_LABELS: Record<ShortcutId, string> = {
  "quick-open": "快速打开",
  search: "全文搜索",
};

export const DEFAULT_SHORTCUTS: Record<ShortcutId, string> = {
  "quick-open": "Shift+Shift",
  search: "Ctrl+Shift+F",
};

export const DOUBLE_TAP_WINDOW_MS = 400;

export type KeyboardShortcuts = Record<ShortcutId, string>;

interface ParsedShortcut {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

function parsePart(part: string): Partial<ParsedShortcut> & { key?: string } {
  const token = part.trim();
  const lower = token.toLowerCase();
  if (lower === "ctrl" || lower === "control") return { ctrl: true };
  if (lower === "shift") return { shift: true };
  if (lower === "alt" || lower === "option") return { alt: true };
  if (lower === "meta" || lower === "cmd" || lower === "command" || lower === "win") return { meta: true };
  return { key: token.length === 1 ? token.toLowerCase() : lower };
}

export function parseShortcut(raw: string): ParsedShortcut | null {
  const parts = raw
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const parsed: ParsedShortcut = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: "",
  };

  for (const part of parts) {
    const piece = parsePart(part);
    if (piece.key !== undefined) {
      if (parsed.key) return null;
      parsed.key = piece.key;
      continue;
    }
    if (piece.ctrl) parsed.ctrl = true;
    if (piece.shift) parsed.shift = true;
    if (piece.alt) parsed.alt = true;
    if (piece.meta) parsed.meta = true;
  }

  return parsed.key ? parsed : null;
}

export function isDoubleTapShortcut(raw: string): boolean {
  return /^shift\s*\+\s*shift$/i.test(raw.trim());
}

export function normalizeShortcut(raw: string): string {
  if (isDoubleTapShortcut(raw)) return "Shift+Shift";

  const parsed = parseShortcut(raw);
  if (!parsed) return raw.trim();

  const parts: string[] = [];
  if (parsed.ctrl) parts.push("Ctrl");
  if (parsed.shift) parts.push("Shift");
  if (parsed.alt) parts.push("Alt");
  if (parsed.meta) parts.push("Meta");
  parts.push(parsed.key.length === 1 ? parsed.key.toUpperCase() : parsed.key);
  return parts.join("+");
}

export function formatShortcutLabel(raw: string): string {
  return normalizeShortcut(raw);
}

export function matchesShortcut(event: KeyboardEvent, raw: string): boolean {
  const parsed = parseShortcut(raw);
  if (!parsed) return false;

  const wantsModifier = parsed.ctrl || parsed.meta;
  const hasModifier = event.ctrlKey || event.metaKey;
  const eventKey = event.key.toLowerCase();

  return (
    hasModifier === wantsModifier &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt &&
    eventKey === parsed.key
  );
}

export function loadKeyboardShortcuts(saved?: Partial<KeyboardShortcuts>): KeyboardShortcuts {
  return {
    ...DEFAULT_SHORTCUTS,
    ...saved,
  };
}
