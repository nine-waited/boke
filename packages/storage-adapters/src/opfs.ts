import type { VaultAdapter, VaultEntry } from "@boke/core";
import { joinPath, normalizePath } from "@boke/core";

const VAULT_ROOT = "vault";

async function getRoot(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory();
}

async function getDirHandle(
  root: FileSystemDirectoryHandle,
  path: string,
  create = false,
): Promise<FileSystemDirectoryHandle> {
  const parts = [VAULT_ROOT, ...normalizePath(path).split("/").filter(Boolean)];
  let current = root;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create });
  }
  return current;
}

async function getFileHandle(
  root: FileSystemDirectoryHandle,
  path: string,
  create = false,
): Promise<FileSystemFileHandle> {
  const normalized = normalizePath(path);
  const parts = normalized.split("/").filter(Boolean);
  const fileName = parts.pop()!;
  const dir = parts.length ? await getDirHandle(root, parts.join("/"), create) : await getDirHandle(root, "", create);
  return dir.getFileHandle(fileName, { create });
}

export class OpfsAdapter implements VaultAdapter {
  readonly kind = "opfs" as const;
  readonly id = "opfs-default";
  readonly name = "Browser Vault (OPFS)";
  private assetUrls = new Map<string, string>();

  private async root(): Promise<FileSystemDirectoryHandle> {
    return getRoot();
  }

  async read(path: string): Promise<string> {
    const root = await this.root();
    const fh = await getFileHandle(root, path);
    const file = await fh.getFile();
    return file.text();
  }

  async readBinary(path: string): Promise<Uint8Array> {
    const root = await this.root();
    const fh = await getFileHandle(root, path);
    const file = await fh.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }

  async write(path: string, content: string): Promise<void> {
    const root = await this.root();
    const fh = await getFileHandle(root, path, true);
    const writable = await fh.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async writeBinary(path: string, content: Uint8Array): Promise<void> {
    const root = await this.root();
    const fh = await getFileHandle(root, path, true);
    const writable = await fh.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async delete(path: string): Promise<void> {
    const root = await this.root();
    const normalized = normalizePath(path);
    const parts = normalized.split("/").filter(Boolean);
    const fileName = parts.pop()!;
    const dir = parts.length ? await getDirHandle(root, parts.join("/")) : await getDirHandle(root, "");
    await dir.removeEntry(fileName);
    this.assetUrls.delete(normalized);
  }

  async list(dir = ""): Promise<VaultEntry[]> {
    const root = await this.root();
    const handle = dir ? await getDirHandle(root, dir) : await getDirHandle(root, "");
    const entries: VaultEntry[] = [];
    for await (const [name, entry] of handle.entries()) {
      const path = joinPath(dir, name);
      if (entry.kind === "directory") {
        entries.push({ path, name, kind: "directory" });
      } else {
        const file = await (entry as FileSystemFileHandle).getFile();
        entries.push({
          path,
          name,
          kind: "file",
          size: file.size,
          mtimeMs: file.lastModified,
        });
      }
    }
    return entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async mkdir(path: string): Promise<void> {
    const root = await this.root();
    await getDirHandle(root, path, true);
  }

  async exists(path: string): Promise<boolean> {
    try {
      const root = await this.root();
      await getFileHandle(root, path);
      return true;
    } catch {
      return false;
    }
  }

  async getAssetUrl(path: string): Promise<string> {
    const normalized = normalizePath(path);
    const cached = this.assetUrls.get(normalized);
    if (cached) return cached;
    const root = await this.root();
    const fh = await getFileHandle(root, normalized);
    const file = await fh.getFile();
    const url = URL.createObjectURL(file);
    this.assetUrls.set(normalized, url);
    return url;
  }
}
