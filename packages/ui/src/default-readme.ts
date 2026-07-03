export const DEFAULT_README_PATH = "README.md";

import { getDefaultReadmeContent, type Locale } from "./i18n/messages.js";

export async function ensureDefaultReadme(
  exists: (path: string) => Promise<boolean>,
  write: (path: string, content: string) => Promise<void>,
  locale: Locale,
): Promise<boolean> {
  if (await exists(DEFAULT_README_PATH)) return false;
  await write(DEFAULT_README_PATH, getDefaultReadmeContent(locale));
  return true;
}
