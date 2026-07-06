import {
  formatMarkdownImageRef,
  normalizeMarkdownAssetRef,
  NOTE_PIC_SUFFIX,
  resolvePathSegments,
  transformMarkdownImageRefs,
} from "./note-images.js";
import { isImage } from "./types.js";
import { fileBaseName } from "./service.js";

/** File name from a same-directory markdown image ref, e.g. `image.png` or `./image.png`. */
export function resolveBundleImageFileName(ref: string): string | null {
  const raw = normalizeMarkdownAssetRef(ref);
  if (!raw || /^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return null;
  }

  const norm = resolvePathSegments(raw);
  if (!norm || /^https?:\/\//i.test(norm) || norm.startsWith("data:") || norm.startsWith("blob:")) {
    return null;
  }
  if (/^[a-zA-Z]:\//.test(norm)) return null;

  const fileName = norm.split("/").pop() ?? "";
  return fileName && isImage(fileName) ? fileName : null;
}

/** Pick the markdown file in a flat bundle folder, preferring `{folderName}.md`. */
export function selectBundleMarkdownFile(mdFileNames: string[], folderName: string): string | null {
  if (mdFileNames.length === 0) return null;
  const match = mdFileNames.find((name) => name.replace(/\.md$/i, "") === folderName);
  return match ?? mdFileNames[0] ?? null;
}

export function notePicMarkdownPrefix(mdPath: string): string {
  return `${fileBaseName(mdPath)}${NOTE_PIC_SUFFIX}`;
}

export function rewriteBundleImagesForNote(
  content: string,
  picMarkdownPrefix: string,
  fileNameMap: ReadonlyMap<string, string>,
): string {
  return transformMarkdownImageRefs(content, (ref, full) => {
    const sourceName = resolveBundleImageFileName(ref);
    if (!sourceName) return undefined;

    const destName = fileNameMap.get(sourceName);
    if (!destName) return undefined;

    const altMatch = full.match(/^!\[([^\]]*)\]/);
    const titleMatch = full.match(/\)\s*"([^"]*)"\s*\)$/);
    const alt = altMatch?.[1] ?? "";
    const title = titleMatch?.[1];
    return formatMarkdownImageRef(alt, `${picMarkdownPrefix}/${destName}`, title);
  });
}
