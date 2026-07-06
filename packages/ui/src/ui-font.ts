export type UiFont = "microsoft-yahei" | "yozai" | "xiaolai";

export const UI_FONTS: Array<{ value: UiFont; labelKey: string }> = [
  { value: "microsoft-yahei", labelKey: "settings.fontMicrosoftYaHei" },
  { value: "xiaolai", labelKey: "settings.fontXiaolai" },
  { value: "yozai", labelKey: "settings.fontYozai" },
];

/** CSS `font-family` stacks; embedded fonts include system fallbacks. */
export const UI_FONT_STACKS: Record<UiFont, string> = {
  "microsoft-yahei": '"Microsoft YaHei", "微软雅黑", sans-serif',
  yozai: '"Yozai", "悠哉", "Microsoft YaHei", "微软雅黑", sans-serif',
  xiaolai: '"Xiaolai SC", "小赖", "Microsoft YaHei", "微软雅黑", sans-serif',
};

export const DEFAULT_UI_FONT: UiFont = "microsoft-yahei";

const FONT_FACE_LOADERS: Partial<Record<UiFont, () => Promise<unknown>>> = {
  yozai: () => import("@chinese-fonts/yozai/dist/Yozai-Regular/result.css"),
  xiaolai: () => import("@chinese-fonts/xiaolai/dist/Xiaolai/result.css"),
};

const loadedFontFaces = new Set<UiFont>();

export function resolveUiFont(value: unknown): UiFont {
  if (typeof value === "string" && value in UI_FONT_STACKS) {
    return value as UiFont;
  }
  return DEFAULT_UI_FONT;
}

function ensureEmbeddedFontFaces(font: UiFont): void {
  const load = FONT_FACE_LOADERS[font];
  if (!load || loadedFontFaces.has(font)) return;
  loadedFontFaces.add(font);
  void load();
}

export function applyUiFont(font: UiFont): void {
  if (typeof document === "undefined") return;
  ensureEmbeddedFontFaces(font);
  document.documentElement.style.setProperty("--boke-font", UI_FONT_STACKS[font]);
  document.documentElement.dataset.uiFont = font;
}

export function getUiFontStack(font: UiFont): string {
  return UI_FONT_STACKS[font];
}
