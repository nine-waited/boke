import MarkdownIt from "markdown-it";
import { workspaceStore } from "./store.js";
import { attachImageClickHandlers } from "./image-open.js";

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

const defaultRender =
  md.renderer.rules.text ||
  ((tokens, idx) => tokens[idx].content);

md.renderer.rules.text = (tokens, idx, options, env, self) => {
  let content = tokens[idx].content as string;

  content = content.replace(
    /!\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
    (_m, target: string, alias?: string) => {
      const name = alias || target.split("/").pop() || target;
      const ext = target.toLowerCase();
      if (/\.(png|jpe?g|gif|webp|svg)$/i.test(ext)) {
        return `<img class="embed-image" data-embed="${target}" alt="${name}" src="" />`;
      }
      if (ext.endsWith(".excalidraw")) {
        return `<div class="embed-excalidraw" data-embed="${target}">📐 ${name}</div>`;
      }
      return `<span class="wikilink" data-path="${target}">${name}</span>`;
    },
  );

  content = content.replace(
    /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
    (_m, target: string, alias?: string) => {
      const name = alias || target.split("/").pop() || target;
      return `<span class="wikilink" data-path="${target}">${name}</span>`;
    },
  );

  content = content.replace(
    /(?:^|\s)#([a-zA-Z\u4e00-\u9fff][\w\u4e00-\u9fff/-]*)/g,
    (m, tag: string) => `${m.startsWith(" ") ? " " : ""}<span class="tag">#${tag}</span>`,
  );

  tokens[idx].content = content;
  return defaultRender(tokens, idx, options, env, self);
};

export function renderMarkdown(content: string): string {
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  return md.render(body);
}

export function attachPreviewHandlers(container: HTMLElement, notePath?: string): void {
  container.querySelectorAll(".wikilink, .embed-excalidraw").forEach((el) => {
    el.addEventListener("click", () => {
      const path = (el as HTMLElement).dataset.path || (el as HTMLElement).dataset.embed;
      if (!path) return;
      const normalized = path.endsWith(".md") || path.endsWith(".excalidraw")
        ? path
        : `${path}.md`;
      if (normalized.endsWith(".excalidraw")) {
        workspaceStore.openExcalidraw(normalized);
      } else {
        workspaceStore.openFile(normalized, { mode: "live" });
      }
    });
  });

  attachImageClickHandlers(container, notePath);
}

export async function hydrateEmbedImages(container: HTMLElement, notePath?: string): Promise<void> {
  const images = container.querySelectorAll<HTMLImageElement>("img[data-embed]");
  const { vaultService } = await import("./store.js");
  const { resolveImageVaultPath, trackImageDisplayUrl } = await import("./image-open.js");
  const adapter = vaultService.getAdapter();
  const vaultRoot =
    adapter?.kind === "tauri" && "getRootPath" in adapter
      ? (adapter as { getRootPath(): string }).getRootPath()
      : null;
  for (const img of images) {
    const path = img.dataset.embed;
    if (!path) continue;
    const vaultPath = resolveImageVaultPath(path, notePath, vaultRoot) ?? path;
    try {
      const url = await vaultService.getAssetUrl(vaultPath);
      img.dataset.vaultPath = vaultPath;
      trackImageDisplayUrl(url, vaultPath);
      img.src = url;
    } catch {
      img.alt = `Failed to load ${path}`;
    }
  }

  const { resolveImageSrcForDisplay } = await import("./note-images.js");
  for (const img of container.querySelectorAll<HTMLImageElement>("img:not([data-embed])")) {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("blob:") || src.startsWith("data:") || /^https?:\/\//i.test(src)) {
      continue;
    }
    try {
      const vaultPath = resolveImageVaultPath(src, notePath, vaultRoot) ?? src.replace(/\\/g, "/");
      const url = await resolveImageSrcForDisplay(vaultPath);
      img.dataset.vaultPath = vaultPath;
      img.src = url;
    } catch {
      img.alt = `Failed to load ${src}`;
    }
  }
}
