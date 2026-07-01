import type { VaultAdapter, VaultEntry } from "@boke/core";
import { joinPath, normalizePath } from "@boke/core";

const DB_NAME = "boke-fsa-handles";
const STORE = "handles";

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandle(id: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadHandle(id: string): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function getDirHandle(
  root: FileSystemDirectoryHandle,
  path: string,
  create = false,
): Promise<FileSystemDirectoryHandle> {
  const parts = normalizePath(path).split("/").filter(Boolean);
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
  const dir = parts.length ? await getDirHandle(root, parts.join("/"), create) : root;
  return dir.getFileHandle(fileName, { create });
}

export function isFsaSupported(): boolean {
  return typeof window !== "undefined" && window.isSecureContext && "showDirectoryPicker" in window;
}

export class FileSystemAccessAdapter implements VaultAdapter {
  readonly kind = "fsa" as const;
  private root: FileSystemDirectoryHandle;
  private assetUrls = new Map<string, string>();

  private constructor(
    readonly id: string,
    readonly name: string,
    root: FileSystemDirectoryHandle,
  ) {
    this.root = root;
  }

  static async pick(): Promise<FileSystemAccessAdapter> {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    const id = crypto.randomUUID();
    await saveHandle(id, handle);
    return new FileSystemAccessAdapter(id, handle.name, handle);
  }

  static async restore(id: string): Promise<FileSystemAccessAdapter | null> {
    const handle = await loadHandle(id);
    if (!handle) return null;
    const perm = await handle.requestPermission({ mode: "readwrite" });
    if (perm !== "granted") return null;
    return new FileSystemAccessAdapter(id, handle.name, handle);
  }

  async read(path: string): Promise<string> {
    const fh = await getFileHandle(this.root, path);
    const file = await fh.getFile();
    return file.text();
  }

  async readBinary(path: string): Promise<Uint8Array> {
    const fh = await getFileHandle(this.root, path);
    const file = await fh.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }

  async write(path: string, content: string): Promise<void> {
    const fh = await getFileHandle(this.root, path, true);
    const writable = await fh.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async writeBinary(path: string, content: Uint8Array): Promise<void> {
    const fh = await getFileHandle(this.root, path, true);
    const writable = await fh.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async delete(path: string): Promise<void> {
    const normalized = normalizePath(path);
    const parts = normalized.split("/").filter(Boolean);
    const fileName = parts.pop()!;
    const dir = parts.length ? await getDirHandle(this.root, parts.join("/")) : this.root;
    await dir.removeEntry(fileName);
    this.assetUrls.delete(normalized);
  }

  async list(dir = ""): Promise<VaultEntry[]> {
    const handle = dir ? await getDirHandle(this.root, dir) : this.root;
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
    await getDirHandle(this.root, path, true);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await getFileHandle(this.root, path);
      return true;
    } catch {
      try {
        await getDirHandle(this.root, path);
        return true;
      } catch {
        return false;
      }
    }
  }

  async getAssetUrl(path: string): Promise<string> {
    const normalized = normalizePath(path);
    const cached = this.assetUrls.get(normalized);
    if (cached) return cached;
    const fh = await getFileHandle(this.root, normalized);
    const file = await fh.getFile();
    const url = URL.createObjectURL(file);
    this.assetUrls.set(normalized, url);
    return url;
  }
}
