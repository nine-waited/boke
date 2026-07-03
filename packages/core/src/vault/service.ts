import type { VaultAdapter } from "./types.js";
import {
  isAttachment,
  isExcalidraw,
  isMarkdown,
  listAllFiles,
  normalizePath,
  joinPath,
} from "./types.js";
import {
  notePicDirPath,
  rewriteNotePicPaths,
  sanitizeImageFileName,
  toMarkdownAssetPath,
} from "./note-images.js";
import { metadataCache } from "../metadata/cache.js";
import { searchIndex } from "../search/index.js";
import { eventBus } from "../plugins/host.js";

export class VaultService {
  private adapter: VaultAdapter | null = null;
  private saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

  getAdapter(): VaultAdapter | null {
    return this.adapter;
  }

  async mount(adapter: VaultAdapter): Promise<void> {
    this.adapter = adapter;
    await this.reindex();
  }

  async unmount(): Promise<void> {
    this.adapter = null;
    metadataCache.getAll().forEach((f) => metadataCache.remove(f.path));
    searchIndex.clear();
  }

  async reindex(): Promise<void> {
    if (!this.adapter) return;
    searchIndex.clear();
    const files = await listAllFiles(this.adapter);
    for (const file of files) {
      if (!isMarkdown(file.path)) continue;
      try {
        const content = await this.adapter.read(file.path);
        const cache = metadataCache.set(file.path, content);
        const { body } = stripFrontmatter(content);
        searchIndex.indexFile(cache, body);
      } catch (err) {
        console.warn(`[boke] failed to index ${file.path}:`, err);
      }
    }
  }

  async read(path: string): Promise<string> {
    if (!this.adapter) throw new Error("No vault mounted");
    return this.adapter.read(normalizePath(path));
  }

  async write(path: string, content: string, immediate = false): Promise<void> {
    if (!this.adapter) throw new Error("No vault mounted");
    const normalized = normalizePath(path);
    if (immediate) {
      await this.adapter.write(normalized, content);
      this.afterSave(normalized, content);
      return;
    }
    const existing = this.saveTimers.get(normalized);
    if (existing) clearTimeout(existing);
    this.saveTimers.set(
      normalized,
      setTimeout(async () => {
        this.saveTimers.delete(normalized);
        await this.adapter!.write(normalized, content);
        this.afterSave(normalized, content);
      }, 400),
    );
  }

  async flushPending(): Promise<void> {
    const pending = [...this.saveTimers.entries()];
    this.saveTimers.clear();
    for (const [path, timer] of pending) {
      clearTimeout(timer);
    }
  }

  async deletePath(path: string, kind: "file" | "directory"): Promise<void> {
    if (!this.adapter) throw new Error("No vault mounted");
    const normalized = normalizePath(path);
    const prefix = `${normalized}/`;

    const allFiles = await listAllFiles(this.adapter);
    for (const file of allFiles) {
      if (file.path !== normalized && !file.path.startsWith(prefix)) continue;
      const pending = this.saveTimers.get(file.path);
      if (pending) {
        clearTimeout(pending);
        this.saveTimers.delete(file.path);
      }
      if (isMarkdown(file.path)) {
        metadataCache.remove(file.path);
        searchIndex.removeFile(file.path);
      }
    }

    if (kind === "file") {
      const pending = this.saveTimers.get(normalized);
      if (pending) {
        clearTimeout(pending);
        this.saveTimers.delete(normalized);
      }
      if (isMarkdown(normalized)) {
        metadataCache.remove(normalized);
        searchIndex.removeFile(normalized);
      }
    }

    await this.adapter.delete(normalized);
  }

  async listTree(dir = ""): Promise<import("./types.js").VaultEntry[]> {
    if (!this.adapter) return [];
    return this.adapter.list(dir);
  }

  async listMarkdown(): Promise<Array<{ path: string; size: number; mtimeMs: number }>> {
    if (!this.adapter) return [];
    const files = await listAllFiles(this.adapter);
    return files
      .filter((f) => isMarkdown(f.path))
      .map((f) => ({ path: f.path, size: f.size ?? 0, mtimeMs: f.mtimeMs ?? 0 }));
  }

  async listAttachments(): Promise<Array<{ path: string; size: number; mtimeMs: number }>> {
    if (!this.adapter) return [];
    const files = await listAllFiles(this.adapter);
    return files
      .filter((f) => isAttachment(f.path))
      .map((f) => ({ path: f.path, size: f.size ?? 0, mtimeMs: f.mtimeMs ?? 0 }));
  }

  async createNote(dir = "", title = "Untitled"): Promise<string> {
    if (!this.adapter) throw new Error("No vault mounted");
    const base = normalizePath(dir);
    if (base) await this.adapter.mkdir(base);
    let path = joinPath(base, `${title}.md`);
    let i = 1;
    while (await this.adapter.exists(path)) {
      path = joinPath(base, `${title} ${i}.md`);
      i++;
    }
    const content = "";
    await this.adapter.write(path, content);
    this.afterSave(path, content);
    return path;
  }

  async renameFile(path: string, newTitle: string): Promise<string> {
    if (!this.adapter) throw new Error("No vault mounted");
    const normalized = normalizePath(path);
    let ext: string;
    if (isMarkdown(normalized)) ext = ".md";
    else if (isExcalidraw(normalized)) ext = ".excalidraw";
    else throw new Error("Unsupported file type");

    const safe = sanitizeNoteTitle(newTitle);
    const currentBase = fileBaseName(normalized);
    if (safe === currentBase) return normalized;

    const dir = normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : "";
    let nextPath = dir ? `${dir}/${safe}${ext}` : `${safe}${ext}`;
    let i = 1;
    while ((await this.adapter.exists(nextPath)) && nextPath !== normalized) {
      nextPath = dir ? `${dir}/${safe} ${i}${ext}` : `${safe} ${i}${ext}`;
      i++;
    }
    if (nextPath === normalized) return normalized;

    const pending = this.saveTimers.get(normalized);
    if (pending) {
      clearTimeout(pending);
      this.saveTimers.delete(normalized);
    }

    let content = await this.adapter.read(normalized);
    if (isMarkdown(normalized)) {
      const oldPicDir = notePicDirPath(normalized);
      const newPicDir = notePicDirPath(nextPath);
      if (oldPicDir !== newPicDir && (await this.adapter.exists(oldPicDir))) {
        await this.adapter.rename(oldPicDir, newPicDir);
      }
      content = rewriteNotePicPaths(
        content,
        oldPicDir,
        newPicDir,
        this.resolveAbsolutePath(oldPicDir),
        this.resolveAbsolutePath(newPicDir),
      );
    }

    await this.adapter.write(nextPath, content);
    await this.adapter.delete(normalized);

    if (isMarkdown(normalized)) {
      metadataCache.remove(normalized);
      searchIndex.removeFile(normalized);
      this.afterSave(nextPath, content);
    }
    eventBus.emit("file-rename", { from: normalized, to: nextPath });
    return nextPath;
  }

  async renameNote(path: string, newTitle: string): Promise<string> {
    return this.renameFile(path, newTitle);
  }

  async renameFolder(path: string, newName: string): Promise<string> {
    if (!this.adapter) throw new Error("No vault mounted");
    const normalized = normalizePath(path);
    const safe = sanitizeFolderName(newName);
    const currentName = normalized.split("/").pop() ?? normalized;
    if (safe === currentName) return normalized;

    const parent = normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : "";
    let nextPath = parent ? `${parent}/${safe}` : safe;
    let i = 1;
    while ((await this.adapter.exists(nextPath)) && nextPath !== normalized) {
      nextPath = parent ? `${parent}/${safe} ${i}` : `${safe} ${i}`;
      i++;
    }
    if (nextPath === normalized) return normalized;

    const prefix = `${normalized}/`;
    const allFiles = await listAllFiles(this.adapter);
    const affected = allFiles.filter((f) => f.path === normalized || f.path.startsWith(prefix));

    for (const file of affected) {
      const pending = this.saveTimers.get(file.path);
      if (pending) {
        clearTimeout(pending);
        this.saveTimers.delete(file.path);
      }
      if (isMarkdown(file.path)) {
        metadataCache.remove(file.path);
        searchIndex.removeFile(file.path);
      }
    }

    await this.adapter.rename(normalized, nextPath);

    for (const file of affected) {
      if (!isMarkdown(file.path)) continue;
      const newFilePath =
        file.path === normalized ? nextPath : `${nextPath}${file.path.slice(normalized.length)}`;
      const content = await this.adapter.read(newFilePath);
      this.afterSave(newFilePath, content);
      eventBus.emit("file-rename", { from: file.path, to: newFilePath });
    }

    return nextPath;
  }

  async createFolder(dir = "", title = "New folder"): Promise<string> {
    if (!this.adapter) throw new Error("No vault mounted");
    const parent = normalizePath(dir);
    if (parent) await this.adapter.mkdir(parent);
    const safe = sanitizeFolderName(title);
    let path = parent ? `${parent}/${safe}` : safe;
    let i = 1;
    while (await this.adapter.exists(path)) {
      path = parent ? `${parent}/${safe} ${i}` : `${safe} ${i}`;
      i++;
    }
    await this.adapter.mkdir(path);
    return path;
  }

  async createExcalidraw(dir = "", title = "Drawing"): Promise<string> {
    if (!this.adapter) throw new Error("No vault mounted");
    const base = normalizePath(dir);
    if (base) await this.adapter.mkdir(base);
    let path = joinPath(base, `${title}.excalidraw`);
    let i = 1;
    while (await this.adapter.exists(path)) {
      path = joinPath(base, `${title} ${i}.excalidraw`);
      i++;
    }
    const empty = JSON.stringify(
      {
        type: "excalidraw",
        version: 2,
        source: "boke",
        elements: [],
        appState: { viewBackgroundColor: "#ffffff" },
        files: {},
      },
      null,
      2,
    );
    await this.adapter.write(path, empty);
    return path;
  }

  async saveAttachment(file: File): Promise<string> {
    if (!this.adapter) throw new Error("No vault mounted");
    await this.adapter.mkdir("attachments");
    const safeName = file.name.replace(/[^\w.\-()\u4e00-\u9fff]/g, "_");
    let path = `attachments/${safeName}`;
    let i = 1;
    while (await this.adapter.exists(path)) {
      const ext = safeName.includes(".") ? safeName.slice(safeName.lastIndexOf(".")) : "";
      const base = ext ? safeName.slice(0, -ext.length) : safeName;
      path = `attachments/${base}-${i}${ext}`;
      i++;
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    await this.adapter.writeBinary(path, buf);
    return path;
  }

  resolveAbsolutePath(vaultRelativePath: string): string | null {
    if (!this.adapter?.getAbsolutePath) return null;
    return toMarkdownAssetPath(this.adapter.getAbsolutePath(normalizePath(vaultRelativePath)));
  }

  /** Save an image next to the note in `{noteBase}_pic/` and return the markdown link path. */
  async saveNoteImage(mdPath: string, file: File | Blob, suggestedName?: string): Promise<string> {
    if (!this.adapter) throw new Error("No vault mounted");
    const picDir = notePicDirPath(mdPath);
    await this.adapter.mkdir(picDir);

    const mime = file.type || "image/png";
    const sourceName =
      file instanceof File ? file.name : suggestedName ?? "image.png";
    const safeName = sanitizeImageFileName(suggestedName ?? sourceName, mime);
    let vaultPath = joinPath(picDir, safeName);
    let i = 1;
    while (await this.adapter.exists(vaultPath)) {
      const ext = safeName.includes(".") ? safeName.slice(safeName.lastIndexOf(".")) : "";
      const base = ext ? safeName.slice(0, -ext.length) : safeName;
      vaultPath = joinPath(picDir, `${base}-${i}${ext}`);
      i++;
    }

    const buf = new Uint8Array(await file.arrayBuffer());
    await this.adapter.writeBinary(vaultPath, buf);

    const absolute = this.resolveAbsolutePath(vaultPath);
    return absolute ?? vaultPath;
  }

  async getAssetUrl(path: string): Promise<string> {
    if (!this.adapter) throw new Error("No vault mounted");
    return this.adapter.getAssetUrl(normalizePath(path));
  }

  async getPublishableNotes(): Promise<
    Array<{ path: string; title: string; slug: string; date: string; tags: string[] }>
  > {
    const result: Array<{ path: string; title: string; slug: string; date: string; tags: string[] }> = [];
    for (const cache of metadataCache.getAll()) {
      if (cache.frontmatter.publish !== true && cache.frontmatter.publish !== "true") continue;
      const title =
        (typeof cache.frontmatter.title === "string" && cache.frontmatter.title) ||
        cache.path.split("/").pop()?.replace(/\.md$/, "") ||
        cache.path;
      const slug =
        (typeof cache.frontmatter.slug === "string" && cache.frontmatter.slug) ||
        title.toLowerCase().replace(/\s+/g, "-");
      const date =
        (typeof cache.frontmatter.date === "string" && cache.frontmatter.date) ||
        new Date().toISOString().slice(0, 10);
      result.push({ path: cache.path, title, slug, date, tags: cache.tags });
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }

  private afterSave(path: string, content: string): void {
    if (isMarkdown(path)) {
      const cache = metadataCache.set(path, content);
      const { body } = stripFrontmatter(content);
      searchIndex.removeFile(path);
      searchIndex.indexFile(cache, body);
    }
    eventBus.emit("file-save", { path });
  }
}

function stripFrontmatter(content: string): { body: string } {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return { body: match ? content.slice(match[0].length) : content };
}

export function fileBaseName(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.replace(/\.(md|excalidraw)$/i, "");
}

export function noteBaseName(path: string): string {
  return fileBaseName(path);
}

export function sanitizeNoteTitle(title: string): string {
  const trimmed = title.replace(/[\\/:*?"<>|]/g, "").trim();
  return trimmed || "Untitled";
}

export function sanitizeFolderName(title: string): string {
  const trimmed = title.replace(/[\\/:*?"<>|]/g, "").trim();
  return trimmed || "New folder";
}

export const vaultService = new VaultService();

export { isExcalidraw, isMarkdown, isAttachment };
export {
  NOTE_PIC_SUFFIX,
  notePicDirPath,
  formatImageMarkdown,
  toMarkdownAssetPath,
} from "./note-images.js";
