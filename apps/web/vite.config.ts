import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  ],
  resolve: {
    alias: {
      "@playground/engine-fast": path.join(repoRoot, "packages/engine-fast/src/index.ts"),
      "@playground/schema": path.join(repoRoot, "packages/schema/src/index.ts"),
    },
  },
});
