import { vaultService } from "./store.js";

export function formatNativePath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return normalized.replace(/\//g, "\\");
  }
  return path;
}

export function resolveVaultDisplayPath(localVaultPath: string | null, vaultKind: string): string {
  if (localVaultPath) return formatNativePath(localVaultPath);
  if (vaultKind !== "tauri") return "";
  const adapter = vaultService.getAdapter();
  if (adapter?.kind === "tauri" && "getRootPath" in adapter) {
    return formatNativePath((adapter as { getRootPath: () => string }).getRootPath());
  }
  return "";
}

export function normalizeVaultPathInput(input: string): string {
  return input.trim().replace(/\\/g, "/").replace(/\/$/, "");
}

export function isPickCancelled(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /cancel/i.test(message);
}
