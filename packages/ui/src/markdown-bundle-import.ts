import {
  extractMarkdownImageRefs,
  fileBaseName,
  joinPath,
  notePicDirPath,
  rewriteBundleImagesForNote,
  resolveImportableImageRef,
  selectBundleMarkdownFile,
  notePicMarkdownPrefix,
} from "@chestnut/core";
import {
  externalPathExists,
  isTauri,
  listDirectory,
  pickFolder,
  readExternalBinary,
  readExternalText,
} from "@chestnut/storage-adapters";
import { resolveNewItemParentDir, fileTreeSelection } from "./file-tree-selection.js";
import { revealFileInTreeWhenReady } from "./file-tree-expand-context.js";
import { getT } from "./i18n/index.js";
import { fetchMarkdownImageBytes } from "./markdown-remote-images.js";
import { useAppStore, vaultService, workspaceStore } from "./store.js";

function joinAbsPath(dir: string, fileName: string): string {
  const trimmed = dir.replace(/[/\\]+$/, "");
  const sep = trimmed.includes("\\") ? "\\" : "/";
  return `${trimmed}${sep}${fileName}`;
}

function folderBaseName(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const slash = normalized.lastIndexOf("/");
  return slash >= 0 ? normalized.slice(slash + 1) : normalized;
}

function uniqueDestImageName(name: string, used: Set<string>): string {
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

export async function importMarkdownBundleFromFolder(
  destDir = resolveNewItemParentDir(),
): Promise<string> {
  if (!isTauri()) throw new Error("Markdown import requires desktop app");

  const folderPath = await pickFolder();
  const entries = await listDirectory(folderPath);
  const mdNames = entries
    .filter((entry) => entry.kind === "file" && /\.md$/i.test(entry.name))
    .map((entry) => entry.name);
  const mdName = selectBundleMarkdownFile(mdNames, folderBaseName(folderPath));
  if (!mdName) {
    throw new Error("No markdown file found in the selected folder");
  }

  const mdAbsPath = joinAbsPath(folderPath, mdName);
  const content = await readExternalText(mdAbsPath);
  const title = fileBaseName(mdName);
  const notePath = await vaultService.createNote(destDir, title);
  const picDir = notePicDirPath(notePath);
  const picPrefix = notePicMarkdownPrefix(notePath);
  const fileNameMap = new Map<string, string>();
  const usedNames = new Set<string>();

  for (const ref of extractMarkdownImageRefs(content)) {
    if (fileNameMap.has(ref)) continue;

    const importable = resolveImportableImageRef(ref);
    if (!importable) continue;

    if (importable.kind === "local") {
      const sourceAbs = joinAbsPath(folderPath, importable.fileName);
      if (!(await externalPathExists(sourceAbs))) continue;

      const destName = uniqueDestImageName(importable.fileName, usedNames);
      fileNameMap.set(ref, destName);
      const bytes = await readExternalBinary(sourceAbs);
      await vaultService.writeBinary(joinPath(picDir, destName), bytes);
      continue;
    }

    const destName = uniqueDestImageName(importable.suggestedFileName, usedNames);
    fileNameMap.set(ref, destName);
    const bytes = await fetchMarkdownImageBytes(importable.url);
    await vaultService.writeBinary(joinPath(picDir, destName), bytes);
  }

  const rewritten = rewriteBundleImagesForNote(content, picPrefix, fileNameMap);
  await vaultService.write(notePath, rewritten, true);
  return notePath;
}

export async function importAndOpenMarkdownBundle(): Promise<void> {
  const notePath = await importMarkdownBundleFromFolder();
  useAppStore.getState().refreshTree();
  fileTreeSelection.setSelectedFilePath(notePath);
  void revealFileInTreeWhenReady(notePath);
  workspaceStore.openFile(notePath);
  useAppStore.getState().setStatusText(getT()("status.importMarkdownSuccess", { path: notePath }));
}
