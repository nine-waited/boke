import html2pdf from "html2pdf.js";
import { fileBaseName, pdfPathForMarkdown } from "@boke/core";
import { isTauri } from "@boke/storage-adapters";
import { renderMarkdown } from "./markdown.js";
import { resolveImageSrcForDisplay } from "./note-images.js";
import { usePdfExportProgressStore } from "./pdf-export-progress.js";
import { useAppStore, vaultService } from "./store.js";
import { getUiFontStack } from "./ui-font.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function inlineImagesForExport(html: string): Promise<string> {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const images = doc.querySelectorAll("img");
  await Promise.all(
    Array.from(images).map(async (img) => {
      const embed = img.getAttribute("data-embed");
      const src = img.getAttribute("src");
      const path = embed || src;
      if (!path) return;
      try {
        img.setAttribute("src", await resolveImageSrcForDisplay(path));
      } catch {
        img.setAttribute("alt", img.getAttribute("alt") ?? "Image");
      }
    }),
  );
  return doc.body.firstElementChild?.innerHTML ?? html;
}

function exportStyles(fontStack: string): string {
  return `
    .boke-pdf-export-root {
      box-sizing: border-box;
      width: 794px;
      padding: 40px 48px;
      font-family: ${fontStack};
      font-size: 14px;
      line-height: 1.7;
      color: #111827;
      background: #ffffff;
    }
    .boke-pdf-export-root h1,
    .boke-pdf-export-root h2,
    .boke-pdf-export-root h3 {
      margin-top: 1.4em;
      margin-bottom: 0.5em;
      line-height: 1.3;
    }
    .boke-pdf-export-root h1 { font-size: 1.65rem; margin-top: 0; }
    .boke-pdf-export-root h2 { font-size: 1.35rem; }
    .boke-pdf-export-root h3 { font-size: 1.15rem; }
    .boke-pdf-export-root p { margin: 0.75em 0; }
    .boke-pdf-export-root ul,
    .boke-pdf-export-root ol { padding-left: 1.4em; margin: 0.75em 0; }
    .boke-pdf-export-root blockquote {
      margin: 1em 0;
      padding-left: 1em;
      border-left: 3px solid #d1d5db;
      color: #4b5563;
    }
    .boke-pdf-export-root a { color: #2563eb; text-decoration: underline; }
    .boke-pdf-export-root code {
      font-family: Consolas, "Courier New", monospace;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.92em;
    }
    .boke-pdf-export-root pre {
      background: #f3f4f6;
      padding: 14px 16px;
      border-radius: 8px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .boke-pdf-export-root pre code { background: transparent; padding: 0; }
    .boke-pdf-export-root img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 8px 0;
    }
    .boke-pdf-export-root table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    .boke-pdf-export-root th,
    .boke-pdf-export-root td {
      border: 1px solid #e5e7eb;
      padding: 6px 10px;
      text-align: left;
    }
    .boke-pdf-export-root .wikilink,
    .boke-pdf-export-root .tag { color: #7c3aed; }
  `;
}

export async function exportMarkdownToPdf(relativePath: string): Promise<string> {
  if (!isTauri()) throw new Error("PDF export requires desktop app");

  const outputPath = pdfPathForMarkdown(relativePath);
  const title = fileBaseName(relativePath);
  const progress = usePdfExportProgressStore.getState();

  progress.start(`${title}.pdf`);

  try {
    progress.setProgress(8, "prepare");
    const content = await vaultService.read(relativePath);

    progress.setProgress(22, "render");
    const rendered = renderMarkdown(content);

    progress.setProgress(36, "images");
    const bodyHtml = await inlineImagesForExport(rendered);
    const fontStack = getUiFontStack(useAppStore.getState().uiFont);

    const styleEl = document.createElement("style");
    styleEl.textContent = exportStyles(fontStack);

    const root = document.createElement("div");
    root.className = "boke-pdf-export-root";
    root.innerHTML = `<h1>${escapeHtml(title)}</h1>${bodyHtml}`;

    const mount = document.createElement("div");
    mount.style.position = "fixed";
    mount.style.left = "-10000px";
    mount.style.top = "0";
    mount.style.width = "794px";
    mount.style.pointerEvents = "none";
    mount.style.opacity = "1";
    mount.append(styleEl, root);
    document.body.appendChild(mount);

    try {
      progress.setProgress(45, "generate");
      progress.startGeneratingTicker();

      const pdfBlob = await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `${title}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(root)
        .outputPdf("blob");

      progress.stopTicker();
      progress.setProgress(92, "save");

      const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
      await vaultService.writeBinary(outputPath, bytes);

      await progress.finishSuccess();
      return outputPath;
    } finally {
      mount.remove();
      progress.stopTicker();
    }
  } catch (err) {
    progress.fail();
    throw err;
  }
}
