import { describe, expect, it } from "vitest";
import {
  absolutePathToVaultRelative,
  normalizeMarkdownAssetRef,
  resolveNoteImageVaultPath,
} from "./note-images.js";

describe("normalizeMarkdownAssetRef", () => {
  it("strips angle brackets and decodes spaces", () => {
    expect(
      normalizeMarkdownAssetRef("<C:/Users/x/.boke/New folder/Untitled 2_pic/a.png>"),
    ).toBe("C:/Users/x/.boke/New folder/Untitled 2_pic/a.png");
  });

  it("decodes percent-encoded paths from rendered HTML", () => {
    expect(normalizeMarkdownAssetRef("C:/Users/x/.boke/New%20folder/a.png")).toBe(
      "C:/Users/x/.boke/New folder/a.png",
    );
  });
});

describe("absolutePathToVaultRelative", () => {
  it("maps absolute paths under the vault root", () => {
    const root = "C:/Users/32476/.boke/New folder";
    const abs = "C:/Users/32476/.boke/New folder/Untitled 2_pic/260703124755.png";
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
