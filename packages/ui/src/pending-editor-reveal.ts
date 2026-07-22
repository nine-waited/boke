/** Pending jump target after global search (or similar) opens a note. */

export type PendingEditorReveal = {
  path: string;
  /** 0-based line within note body (after frontmatter). */
  bodyLine: number;
  token: number;
};

let pending: PendingEditorReveal | null = null;
let tokenSeq = 0;
const listeners = new Set<() => void>();

export function requestEditorReveal(path: string, bodyLine: number): void {
  pending = { path, bodyLine, token: ++tokenSeq };
  for (const listener of listeners) listener();
}

export function subscribeEditorReveal(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Consume a pending reveal for `path`. Returns bodyLine, or null if none. */
export function consumeEditorReveal(path: string): number | null {
  if (!pending || pending.path !== path) return null;
  const bodyLine = pending.bodyLine;
  pending = null;
  return bodyLine;
}
