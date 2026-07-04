import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PORT = 1420;
const DEV_URL = `http://127.0.0.1:${PORT}/`;
const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function isViteReady() {
  try {
    const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch {
    return false;
  }
}

if (await isViteReady()) {
  console.log(`[dev] Vite already ready at ${DEV_URL}`);
  process.exit(0);
}

console.log(`[dev] Starting Vite at ${DEV_URL}`);
const vite = spawn(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["exec", "vite"], {
  cwd: desktopRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

vite.on("exit", async (code) => {
  if (code === 0) {
    process.exit(0);
    return;
  }

  if (await isViteReady()) {
    console.log("[dev] Vite port is busy but the dev server is responding");
    process.exit(0);
    return;
  }

  process.exit(code ?? 1);
});
