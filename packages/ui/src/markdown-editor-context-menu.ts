export interface EditorContextMenuPoint {
  x: number;
  y: number;
}

export function attachMarkdownEditorContextMenu(
  editorEl: HTMLElement,
  onOpen: (point: EditorContextMenuPoint) => void,
): () => void {
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onOpen({ x: event.clientX, y: event.clientY });
  };

  editorEl.addEventListener("contextmenu", onContextMenu);
  return () => editorEl.removeEventListener("contextmenu", onContextMenu);
}
