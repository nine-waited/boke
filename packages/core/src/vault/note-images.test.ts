import { describe, expect, it } from "vitest";
import {
  absolutePathToVaultRelative,
  extractMarkdownImageRefs,
  markdownReferencesImage,
  normalizeMarkdownAssetRef,
  resolveNoteImageVaultPath,
} from "./note-images.js";

describe("normalizeMarkdownAssetRef", () => {
  it("strips angle brackets and decodes spaces", () => {
    expect(
      normalizeMarkdownAssetRef("<C:/Users/x/.chestnut/New folder/Untitled 2_pic/a.png>"),
    ).toBe("C:/Users/x/.chestnut/New folder/Untitled 2_pic/a.png");
  });

  it("decodes percent-encoded paths from rendered HTML", () => {
    expect(normalizeMarkdownAssetRef("C:/Users/x/.chestnut/New%20folder/a.png")).toBe(
      "C:/Users/x/.chestnut/New folder/a.png",
    );
  });
});

describe("absolutePathToVaultRelative", () => {
  it("maps absolute paths under the vault root", () => {
    const root = "C:/Users/32476/.chestnut/New folder";
    const abs = "C:/Users/32476/.chestnut/New folder/Untitled 2_pic/260703124755.png";
    expect(absolutePathToVaultRelative(abs, root)).toBe("Untitled 2_pic/260703124755.png");
  });
});

describe("resolveNoteImageVaultPath", () => {
  const notePath = "notes/sub/foo.md";

  it("resolves _pic paths relative to the note directory", () => {
    expect(resolveNoteImageVaultPath("foo_pic/image.png", notePath)).toBe(
      "notes/sub/foo_pic/image.png",
    );
  });

  it("keeps vault-relative paths that already include the note directory", () => {
    expect(resolveNoteImageVaultPath("notes/sub/foo_pic/image.png", notePath)).toBe(
      "notes/sub/foo_pic/image.png",
    );
  });

  it("resolves bare filenames relative to the note directory", () => {
    expect(resolveNoteImageVaultPath("image.png", notePath)).toBe("notes/sub/image.png");
  });
});

describe("extractMarkdownImageRefs", () => {
  it("extracts plain and angle-bracket image paths", () => {
    const md = [
      "![a](foo_pic/a.png)",
      '![b](<C:/vault/note_pic/spaced name.png>)',
      '![c](bar.png "caption")',
    ].join("\n");
    expect(extractMarkdownImageRefs(md)).toEqual([
      "foo_pic/a.png",
      "C:/vault/note_pic/spaced name.png",
      "bar.png",
    ]);
  });
});

describe("markdownReferencesImage", () => {
  const notePath = "notes/foo.md";
  const vaultPath = "notes/foo_pic/image.png";
  const root = "C:/vault";

  it("detects references in markdown", () => {
    expect(markdownReferencesImage("![x](foo_pic/image.png)", vaultPath, notePath)).toBe(true);
    expect(markdownReferencesImage("![x](foo_pic/other.png)", vaultPath, notePath)).toBe(false);
  });

  it("detects absolute paths under vault root", () => {
    const md = "![x](<C:/vault/notes/foo_pic/image.png>)";
    expect(markdownReferencesImage(md, vaultPath, notePath, root)).toBe(true);
  });
});
