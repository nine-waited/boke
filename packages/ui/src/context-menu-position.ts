const VIEWPORT_PADDING = 8;

export function clampContextMenuPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  padding = VIEWPORT_PADDING,
): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const layoutHeight = Math.min(height, vh - padding * 2);
  const maxX = vw - width - padding;
  const maxY = vh - layoutHeight - padding;

  return {
    x: Math.min(Math.max(padding, x), Math.max(padding, maxX)),
    y: Math.min(Math.max(padding, y), Math.max(padding, maxY)),
  };
}
