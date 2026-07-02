import type { VaultAdapter } from "./types.js";
import {
  isAttachment,
  isExcalidraw,
  isMarkdown,
  listAllFiles,
  normalizePath,
} from "./types.js";
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

  async createNote(dir = "notes", title = "Untitled"): Promise<string> {
    if (!this.adapter) throw new Error("No vault mounted");
    const base = normalizePath(dir);
    await this.adapter.mkdir(base);
    let path = `${base}/${title}.md`;
    let i = 1;
    while (await this.adapter.exists(path)) {
      path = `${base}/${title} ${i}.md`;
      i++;
    }
    const content = "";
    await this.adapter.write(path, content);
    this.afterSave(path, content);
    return path;
  }

  async createExcalidraw(dir = "notes", title = "Drawing"): Promise<string> {
    if (!this.adapter) throw new Error("No vault mounted");
    const base = normalizePath(dir);
    await this.adapter.mkdir(base);
    let path = `${base}/${title}.excalidraw`;
    let i = 1;
    while (await this.adapter.exists(path)) {
      path = `${base}/${title} ${i}.excalidraw`;
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

export const vaultService = new VaultService();

export { isExcalidraw, isMarkdown, isAttachment };
