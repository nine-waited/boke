import type { FileTreeDragPayload } from "./file-tree-move.js";

export const FILE_TREE_DROP_ATTR = "data-file-tree-drop";
export const FILE_TREE_PARENT_ATTR = "data-file-tree-parent";
export const FILE_TREE_ROOT_SELECTOR = ".boke-file-tree";

export const FILE_TREE_DRAG_MOVE_PX = 6;
export const FILE_TREE_DRAG_LONG_PRESS_MS = 450;

/** Resolve folder drop target under the pointer; `""` = vault root, `null` = no valid target. */
export function findDropFolderAt(clientX: number, clientY: number): string | null {
  const elements = document.elementsFromPoint(clientX, clientY);

  for (const el of elements) {
    const folderItem = el.closest(`.boke-file-tree-dir[${FILE_TREE_DROP_ATTR}]`);
    if (folderItem instanceof HTMLElement) {
      return folderItem.getAttribute(FILE_TREE_DROP_ATTR) ?? "";
    }
  }

  for (const el of elements) {
    const fileItem = el.closest(`.boke-file-tree-file[${FILE_TREE_PARENT_ATTR}]`);
    if (fileItem instanceof HTMLElement) {
      return fileItem.getAttribute(FILE_TREE_PARENT_ATTR) ?? "";
    }
  }

  const root = document.querySelector(FILE_TREE_ROOT_SELECTOR);
  const top = document.elementFromPoint(clientX, clientY);
  if (root instanceof HTMLElement && top && root.contains(top)) {
    return "";
  }

  // Outside the file tree list — default to vault root.
  return "";
}

export interface FileTreePointerDragSession {
  payload: FileTreeDragPayload;
  pointerId: number;
  startX: number;
  startY: number;
  lastClientX: number;
  lastClientY: number;
  sourceElement: HTMLElement;
  active: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  didDrag: boolean;
}

export function createPointerDragSession(
  payload: FileTreeDragPayload,
  pointerId: number,
  clientX: number,
  clientY: number,
  sourceElement: HTMLElement,
): FileTreePointerDragSession {
  return {
    payload,
    pointerId,
    startX: clientX,
    startY: clientY,
    lastClientX: clientX,
    lastClientY: clientY,
    sourceElement,
    active: false,
    longPressTimer: null,
    didDrag: false,
  };
}

export function pointerDragMovedEnough(session: FileTreePointerDragSession, clientX: number, clientY: number): boolean {
  const dx = clientX - session.startX;
  const dy = clientY - session.startY;
  return Math.hypot(dx, dy) >= FILE_TREE_DRAG_MOVE_PX;
}
