import { isTauri } from "@chestnut/storage-adapters";

async function readTauriClipboardText(): Promise<string | null> {
  const { readText } = await import(
    /* @vite-ignore */ "@tauri-apps/plugin-clipboard-manager"
  );
  try {
    const text = await readText();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

async function writeTauriClipboardText(text: string): Promise<boolean> {
  const { writeText } = await import(
    /* @vite-ignore */ "@tauri-apps/plugin-clipboard-manager"
  );
  try {
    await writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Read plain text from the system clipboard without WebView permission prompts. */
export async function readSystemClipboardText(): Promise<string | null> {
  if (isTauri()) return readTauriClipboardText();

  if (!navigator.clipboard?.readText) return null;
  try {
    const text = await navigator.clipboard.readText();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/** Write plain text to the system clipboard without WebView permission prompts. */
export async function writeSystemClipboardText(text: string): Promise<boolean> {
  if (isTauri()) return writeTauriClipboardText(text);

  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
