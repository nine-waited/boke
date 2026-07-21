/** Focus the main editor surface after hiding the file sidebar. */
export function focusMainContent(): void {
  requestAnimationFrame(() => {
    const root = document.querySelector<HTMLElement>(".boke-content");
    if (!root) return;

    root.focus({ preventScroll: true });

    const activeSlot = root.querySelector<HTMLElement>(".boke-note-pane-slot.is-active");
    const scope = activeSlot ?? root;
    const editor =
      scope.querySelector<HTMLElement>('.ProseMirror[contenteditable="true"]') ??
      scope.querySelector<HTMLElement>(".cm-content") ??
      root.querySelector<HTMLElement>(".boke-excalidraw-wrap") ??
      root.querySelector<HTMLElement>(".boke-image-view") ??
      root.querySelector<HTMLElement>(".boke-pdf-view");

    editor?.focus({ preventScroll: true });
  });
}

export function isFileContentTab(type: string): boolean {
  return type === "markdown" || type === "excalidraw" || type === "image" || type === "pdf";
}
