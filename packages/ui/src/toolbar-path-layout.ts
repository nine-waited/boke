import type { CSSProperties } from "react";

/** Top toolbar vault path layout tweaks. */
export const TOOLBAR_PATH_LAYOUT = {
  copyGapPx: 2,
  /** Copy icon vertical offset (px). Positive = down, negative = up. */
  copyOffsetYPx: 2,
} as const;

export function toolbarPathGroupStyle(): CSSProperties {
  return {
    ["--boke-toolbar-path-copy-gap" as string]: `${TOOLBAR_PATH_LAYOUT.copyGapPx}px`,
    ["--boke-toolbar-path-copy-offset-y" as string]: `${TOOLBAR_PATH_LAYOUT.copyOffsetYPx}px`,
  };
}

export function copyButtonStyle(): CSSProperties {
  const { copyOffsetYPx } = TOOLBAR_PATH_LAYOUT;
  if (copyOffsetYPx === 0) return {};
  return { transform: `translateY(${copyOffsetYPx}px)` };
}
