export function remapVaultPathUnderPrefix(
  current: string,
  oldPrefix: string,
  newPrefix: string,
): string {
  if (current === oldPrefix) return newPrefix;
  const prefix = `${oldPrefix}/`;
  if (current.startsWith(prefix)) {
    return `${newPrefix}${current.slice(oldPrefix.length)}`;
  }
  return current;
}

export function remapVaultPathUnderPrefixNullable(
  current: string | null,
  oldPrefix: string,
  newPrefix: string,
): string | null {
  if (current === null) return null;
  return remapVaultPathUnderPrefix(current, oldPrefix, newPrefix);
}
