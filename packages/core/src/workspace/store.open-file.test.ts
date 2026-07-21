import { describe, expect, it } from "vitest";
import { WorkspaceStore } from "./store.js";

describe("WorkspaceStore.openFile", () => {
  it("activates an existing tab for the same path instead of replacing the active leaf", () => {
    const store = new WorkspaceStore();
    const a = store.openFile("notes/a.md", { newTab: true });
    const b = store.openFile("notes/b.md", { newTab: true });
    expect(store.getState().activeId).toBe(b);

    const again = store.openFile("notes/a.md");
    expect(again).toBe(a);
    expect(store.getState().activeId).toBe(a);
    expect(store.getState().leaves.filter((l) => l.type === "markdown")).toHaveLength(2);
  });

  it("opens a new tab when the active leaf already has another markdown file", () => {
    const store = new WorkspaceStore();
    const a = store.openFile("notes/a.md");
    const b = store.openFile("notes/b.md");
    expect(b).not.toBe(a);
    expect(store.getState().active?.path).toBe("notes/b.md");
    expect(store.getState().leaves.filter((l) => l.type === "markdown")).toHaveLength(2);
  });

  it("reuses an empty welcome leaf for the first file", () => {
    const store = new WorkspaceStore();
    const emptyId = store.getState().activeId;
    const id = store.openFile("notes/a.md");
    expect(id).toBe(emptyId);
    expect(store.getState().active?.path).toBe("notes/a.md");
  });
});
