import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const desktop = join(root, "apps", "desktop");
const tauriDir = join(desktop, "src-tauri");

const paths = [
  join(desktop, "dist"),
  join(desktop, "node_modules", ".vite"),
  join(tauriDir, "target"),
];

for (const path of paths) {
  try {
    rmSync(path, { recursive: true, force: true });
    console.log(`removed ${path}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`skip ${path}: ${message}`);
  }
}

const cargo = spawnSync("cargo", ["clean", "--manifest-path", join(tauriDir, "Cargo.toml")], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (cargo.status !== 0) {
  process.exit(cargo.status ?? 1);
}

console.log("Desktop build cache cleared.");
