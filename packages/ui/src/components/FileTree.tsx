import { useEffect, useState } from "react";
import type { VaultEntry } from "@boke/core";
import { isHiddenPath } from "@boke/core";
import { vaultService, workspaceStore, useAppStore } from "../store.js";

interface FileTreeProps {
  dir?: string;
  depth?: number;
}

function FileTreeNode({ dir = "", depth = 0 }: FileTreeProps) {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [expanded, setExpanded] = useState(depth < 2);
  const treeVersion = useAppStore((s) => s.treeVersion);
  const activePath = workspaceStore.getActivePath();

  useEffect(() => {
    vaultService.listTree(dir).then((list) => {
      setEntries(list.filter((e) => !isHiddenPath(e.path)));
    });
  }, [dir, treeVersion]);

  if (!expanded && depth > 0) {
    return (
      <div
        className="boke-file-tree-item boke-file-tree-dir"
        style={{ paddingLeft: depth * 12 }}
        onClick={() => setExpanded(true)}
      >
        📁 {dir.split("/").pop() || dir}
      </div>
    );
  }

  return (
    <>
      {depth > 0 && (
        <div
          className="boke-file-tree-item boke-file-tree-dir"
          style={{ paddingLeft: depth * 12 }}
          onClick={() => setExpanded(false)}
        >
          📂 {dir.split("/").pop()}
        </div>
      )}
      {expanded &&
        entries.map((entry) =>
          entry.kind === "directory" ? (
            <FileTreeNode key={entry.path} dir={entry.path} depth={depth + 1} />
          ) : (
            <div
              key={entry.path}
              className={`boke-file-tree-item${activePath === entry.path ? " active" : ""}`}
              style={{ paddingLeft: (depth + 1) * 12 }}
              onClick={() => {
                if (entry.path.endsWith(".excalidraw")) {
                  workspaceStore.openExcalidraw(entry.path);
                } else if (entry.path.endsWith(".md")) {
                  workspaceStore.openFile(entry.path);
                }
              }}
            >
              {entry.path.endsWith(".excalidraw") ? "📐" : entry.path.endsWith(".md") ? "📝" : "📄"}{" "}
              {entry.name}
            </div>
          ),
        )}
    </>
  );
}

export function FileTree() {
  return (
    <div className="boke-file-tree">
      <FileTreeNode />
    </div>
  );
}
