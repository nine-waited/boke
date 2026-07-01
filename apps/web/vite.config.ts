import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Boke Knowledge Manager",
        short_name: "Boke",
        description: "Local-first Markdown + Excalidraw knowledge manager",
        theme_color: "#f7f8fa",
        background_color: "#f7f8fa",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@boke/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@boke/core": path.resolve(__dirname, "../../packages/core/src"),
      "@boke/plugin-sdk": path.resolve(__dirname, "../../packages/plugin-sdk/src"),
      "@boke/storage-adapters": path.resolve(__dirname, "../../packages/storage-adapters/src"),
      "@tauri-apps/api/core": path.resolve(
        __dirname,
        "../../packages/storage-adapters/src/tauri-stub.ts",
      ),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          excalidraw: ["@excalidraw/excalidraw"],
        },
      },
    },
  },
});
