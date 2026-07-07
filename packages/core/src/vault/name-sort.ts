const NUMERIC_SUFFIX_RE = /^(.+) (\d+)$/;

export function stripFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

export function parseNameWithNumericSuffix(name: string): { base: string; suffix: number | null } {
  const match = name.match(NUMERIC_SUFFIX_RE);
  if (!match) return { base: name, suffix: null };
  return { base: match[1], suffix: Number.parseInt(match[2], 10) };
}

/** Compare sibling names: same base groups together; trailing ` N` suffixes sort numerically. */
export function compareNamesWithNumericSuffix(a: string, b: string): number {
  const parsedA = parseNameWithNumericSuffix(a);
  const parsedB = parseNameWithNumericSuffix(b);

  const baseCmp = parsedA.base.localeCompare(parsedB.base, undefined, { sensitivity: "base" });
  if (baseCmp !== 0) return baseCmp;

  if (parsedA.suffix === null && parsedB.suffix === null) return 0;
  if (parsedA.suffix === null) return -1;
  if (parsedB.suffix === null) return 1;
  return parsedA.suffix - parsedB.suffix;
}
