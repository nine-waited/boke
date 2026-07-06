import {
  fileBaseName,
  formatMarkdownImageRef,
  joinPath,
  markdownExportDirPath,
  markdownExportFilePath,
  resolveMarkdownImageRefToVaultPath,
  transformMarkdownImageRefs,
} from "@chestnut/core";
import { isTauri } from "@chestnut/storage-adapters";
import { useExportProgressStore } from "./export-progress.js";
import { vaultService } from "./store.js";

function vaultRootPath(): string | null {
  const adapter = vaultService.getAdapter?.();
  if (!adapter || adapter.kind !== "tauri" || !("getRootPath" in adapter)) return null;
  return (adapter as { getRootPath(): string }).getRootPath().replace(/\\/g, "/").replace(/\/$/, "");
}

function uniqueExportFileName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }

  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let index = 2;
  while (used.has(`${stem}-${index}${ext}`)) index += 1;
  const next = `${stem}-${index}${ext}`;
  used.add(next);
  return next;
}

function parseMarkdownImageParts(full: string): { alt: string; title?: string } {
  const altMatch = full.match(/^!\[([^\]]*)\]/);
  const titleMatch = full.match(/\)\s*"([^"]*)"\s*\)$/);
  return {
    alt: altMatch?.[1] ?? "",
    title: titleMatch?.[1],
  };
}

export async function exportMarkdownBundle(relativePath: string): Promise<string> {
  if (!isTauri()) throw new Error("Markdown export requires desktop app");

  const exportMdPath = markdownExportFilePath(relativePath);
  const exportDir = markdownExportDirPath(relativePath);
  const title = fileBaseName(relativePath);
  const progress = useExportProgressStore.getState();

  progress.start({
    fileName: `${title}.md`,
    titleKey: "exportMarkdown.title",
    phasePrefix: "exportMarkdown",
  });

  try {
    progress.setProgress(8, "prepare");
    await vaultService.ensureExportTargetDir();
    const content = await vaultService.read(relativePath);
    const vaultRoot = vaultRootPath();

    progress.setProgress(28, "render");
    const vaultPathToFileName = new Map<string, string>();
    const usedNames = new Set<string>();

    const rewritten = transformMarkdownImageRefs(content, (ref, full) => {
      const vaultPath = resolveMarkdownImageRefToVaultPath(ref, relativePath, vaultRoot);
      if (!vaultPath) return undefined;

      let fileName = vaultPathToFileName.get(vaultPath);
      if (!fileName) {
        const base = vaultPath.split("/").pop() ?? "image.png";
        fileName = uniqueExportFileName(base, usedNames);
        vaultPathToFileName.set(vaultPath, fileName);
      }

      const { alt, title: imageTitle } = parseMarkdownImageParts(full);
      return formatMarkdownImageRef(alt, fileName, imageTitle);
    });

    progress.setProgress(42, "images");
    const imageEntries = [...vaultPathToFileName.entries()];
    for (let index = 0; index < imageEntries.length; index++) {
      const [vaultPath, fileName] = imageEntries[index]!;
      const destPath = joinPath(exportDir, fileName);
      const bytes = await vaultService.readBinary(vaultPath);
      await vaultService.writeBinary(destPath, bytes);
      const pct = 42 + Math.round(((index + 1) / Math.max(imageEntries.length, 1)) * 38);
      progress.setProgress(pct, "images");
    }

    progress.setProgress(88, "save");
    await vaultService.write(exportMdPath, rewritten, true);

    await progress.finishSuccess();
    return exportMdPath;
  } catch (err) {
    progress.fail();
    throw err;
  }
}
