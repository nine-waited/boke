export const OUTLINE_WIDTH_DEFAULT = 220;
export const OUTLINE_WIDTH_MIN = 160;
export const OUTLINE_WIDTH_MAX = 400;

export function clampOutlineWidth(width: number): number {
  return Math.min(OUTLINE_WIDTH_MAX, Math.max(OUTLINE_WIDTH_MIN, Math.round(width)));
}

export interface OutlinePaneLayout {
  width: number;
  collapsed: boolean;
}

export interface OutlineLayouts {
  left: OutlinePaneLayout;
  right: OutlinePaneLayout;
}

function normalizePane(
  raw: unknown,
  options?: { legacyWidth?: number; legacyCollapsed?: boolean; defaultCollapsed?: boolean },
): OutlinePaneLayout {
  const defaultCollapsed = options?.defaultCollapsed ?? false;
  if (raw && typeof raw === "object") {
    const obj = raw as { width?: unknown; collapsed?: unknown };
    return {
      width: clampOutlineWidth(
        typeof obj.width === "number"
          ? obj.width
          : (options?.legacyWidth ?? OUTLINE_WIDTH_DEFAULT),
      ),
      collapsed:
        typeof obj.collapsed === "boolean"
          ? obj.collapsed
          : (options?.legacyCollapsed ?? defaultCollapsed),
    };
  }
  return {
    width: clampOutlineWidth(options?.legacyWidth ?? OUTLINE_WIDTH_DEFAULT),
    collapsed: options?.legacyCollapsed ?? defaultCollapsed,
  };
}

/** Accepts new `outlineLayouts` or legacy single outlineWidth/outlineCollapsed. */
export function normalizeOutlineLayouts(
  layouts: unknown,
  legacy?: { width?: number; collapsed?: boolean },
): OutlineLayouts {
  if (layouts && typeof layouts === "object") {
    const obj = layouts as { left?: unknown; right?: unknown };
    return {
      left: normalizePane(obj.left, {
        legacyWidth: legacy?.width,
        legacyCollapsed: legacy?.collapsed,
        defaultCollapsed: false,
      }),
      // Right pane defaults to collapsed (only used in split).
      right: normalizePane(obj.right, { defaultCollapsed: true }),
    };
  }
  return {
    left: normalizePane(null, {
      legacyWidth: legacy?.width,
      legacyCollapsed: legacy?.collapsed,
      defaultCollapsed: false,
    }),
    right: normalizePane(null, { defaultCollapsed: true }),
  };
}
