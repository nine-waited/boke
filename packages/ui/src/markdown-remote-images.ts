import { normalizeMarkdownAssetRef, parseCloudAttachmentVaultPath } from "@chestnut/core";
import { useAppStore, vaultService } from "./store.js";

/** Download image bytes for a markdown ref (cloud attachment URL, vault path, or remote http URL). */
export async function fetchMarkdownImageBytes(ref: string): Promise<Uint8Array> {
  const normalized = normalizeMarkdownAssetRef(ref);
  const vaultPath = parseCloudAttachmentVaultPath(ref);
  if (vaultPath) {
    try {
      return await vaultService.readBinary(vaultPath);
    } catch {
      // Fall through to HTTP fetch when vault read fails (e.g. external bundle URL).
    }
  }

  const headers = new Headers();
  const remote = useAppStore.getState().remoteConfig;
  if (remote) {
    try {
      const url = new URL(normalized);
      const base = new URL(remote.baseUrl);
      if (url.origin === base.origin) {
        headers.set("Authorization", `Bearer ${remote.token}`);
      }
    } catch {
      // ignore malformed URLs
    }
  }

  const response = await fetch(normalized, { headers });
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status}): ${normalized}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}
