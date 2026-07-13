import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const dataRoot = path.join(repoRoot, "data", "generated");

/** GitHub Pages project site base path. */
const base = process.env.VITE_BASE_PATH ?? "/Playground/";

export default defineConfig({
  base,
  plugins: [
    {
      name: "serve-generated-data",
      configureServer(server) {
        server.middlewares.use("/data", (req, res, next) => {
          const url = req.url ?? "/";
          const rel = url.replace(/^\//, "");
          const filePath = path.join(dataRoot, rel);
          if (!filePath.startsWith(dataRoot) || !fs.existsSync(filePath)) {
            next();
            return;
          }
          res.setHeader("Content-Type", "application/gzip");
          fs.createReadStream(filePath).pipe(res);
        });
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon-192.svg", "icon-512.svg"],
      manifest: {
        name: "TF2 Live Bounce Checker",
        short_name: "Bounce Check",
        description: "Live TF2 bounce checker — DEFAULT checks and precomputed setups",
        theme_color: "#12161e",
        background_color: "#0c0f14",
        display: "standalone",
        orientation: "any",
        start_url: base,
        scope: base,
        icons: [
          {
            src: "icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,bin,gz,woff2}"],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/^\/data\//],
      },
    }),
  ],
  resolve: {
    alias: {
      "@playground/engine-fast": path.join(repoRoot, "packages/engine-fast/src/index.ts"),
      "@playground/schema": path.join(repoRoot, "packages/schema/src/index.ts"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
