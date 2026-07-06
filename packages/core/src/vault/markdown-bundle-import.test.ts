import { describe, expect, it } from "vitest";
import {
  notePicMarkdownPrefix,
  resolveBundleImageFileName,
  rewriteBundleImagesForNote,
  selectBundleMarkdownFile,
} from "./markdown-bundle-import.js";

describe("resolveBundleImageFileName", () => {
  it("accepts bare and ./ relative image names", () => {
    expect(resolveBundleImageFileName("image.png")).toBe("image.png");
    expect(resolveBundleImageFileName("./image-260707003411.png")).toBe("image-260707003411.png");
  });

  it("ignores remote urls", () => {
    expect(resolveBundleImageFileName("https://example.com/a.png")).toBeNull();
  });
});

describe("selectBundleMarkdownFile", () => {
  it("prefers a markdown file matching the folder name", () => {
    expect(selectBundleMarkdownFile(["Other.md", "MyNote.md"], "MyNote")).toBe("MyNote.md");
    expect(selectBundleMarkdownFile(["Other.md"], "MyNote")).toBe("Other.md");
  });
});

describe("rewriteBundleImagesForNote", () => {
  it("rewrites same-directory refs to note _pic paths", () => {
    const map = new Map([["image.png", "image.png"]]);
    const next = rewriteBundleImagesForNote(
      "![1.00](image.png)",
      "MyNote_pic",
      map,
    );
    expect(next).toBe("![1.00](MyNote_pic/image.png)");
  });
});

describe("notePicMarkdownPrefix", () => {
  it("derives the markdown prefix from the note path", () => {
    expect(notePicMarkdownPrefix("notes/MyNote.md")).toBe("MyNote_pic");
  });
});
