let ghostEl: HTMLElement | null = null;
let offsetX = 0;
let offsetY = 0;

export function attachFileTreeDragGhost(
  source: HTMLElement,
  clientX: number,
  clientY: number,
): void {
  detachFileTreeDragGhost();

  const rect = source.getBoundingClientRect();
  offsetX = clientX - rect.left;
  offsetY = clientY - rect.top;

  ghostEl = source.cloneNode(true) as HTMLElement;
  ghostEl.classList.add("boke-file-tree-drag-ghost");
  ghostEl.setAttribute("aria-hidden", "true");
  ghostEl.style.width = `${rect.width}px`;
  moveFileTreeDragGhost(clientX, clientY);

  document.body.appendChild(ghostEl);
}

export function moveFileTreeDragGhost(clientX: number, clientY: number): void {
  if (!ghostEl) return;
  ghostEl.style.transform = `translate(${clientX - offsetX}px, ${clientY - offsetY}px)`;
}

export function detachFileTreeDragGhost(): void {
  ghostEl?.remove();
  ghostEl = null;
  offsetX = 0;
  offsetY = 0;
}
