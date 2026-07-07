import { describe, expect, it } from "vitest";
import { compareNamesWithNumericSuffix, parseNameWithNumericSuffix, stripFileExtension } from "./name-sort.js";

describe("parseNameWithNumericSuffix", () => {
  it("parses trailing space + digits", () => {
    expect(parseNameWithNumericSuffix("New folder 10")).toEqual({
      base: "New folder",
      suffix: 10,
    });
  });

  it("leaves names without suffix unchanged", () => {
    expect(parseNameWithNumericSuffix("New folder")).toEqual({
      base: "New folder",
      suffix: null,
    });
  });
});

describe("compareNamesWithNumericSuffix", () => {
  it("sorts numeric suffixes numerically within the same base", () => {
    const names = ["New folder 10", "New folder 2", "New folder 1", "New folder"];
    expect([...names].sort(compareNamesWithNumericSuffix)).toEqual([
      "New folder",
      "New folder 1",
      "New folder 2",
      "New folder 10",
    ]);
  });

  it("falls back to string order for different bases", () => {
    expect(compareNamesWithNumericSuffix("Alpha", "Beta")).toBeLessThan(0);
    expect(compareNamesWithNumericSuffix("Beta 2", "Alpha 10")).toBeGreaterThan(0);
  });

  it("sorts markdown files by stem without extension", () => {
    const names = [
      "未命名 10.md",
      "未命名 2.md",
      "未命名 1.md",
      "未命名 11.md",
      "未命名.md",
      "未命名 9.md",
    ];
    const sorted = [...names]
      .map(stripFileExtension)
      .sort(compareNamesWithNumericSuffix)
      .map((stem) => (stem === "未命名" ? "未命名.md" : `${stem}.md`));
    expect(sorted).toEqual([
      "未命名.md",
      "未命名 1.md",
      "未命名 2.md",
      "未命名 9.md",
      "未命名 10.md",
      "未命名 11.md",
    ]);
  });
});
