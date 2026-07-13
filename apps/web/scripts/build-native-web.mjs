import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "../..");
const generatedDataRoot = path.join(repoRoot, "data", "generated");
const distDataRoot = path.join(webRoot, "dist", "data");

const env = {
  ...process.env,
  VITE_BASE_PATH: "./",
};

function run(command, args) {
  const result = spawnSync(command, args, {
    env,
    shell: true,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("tsc", []);
run("vite", ["build"]);

if (existsSync(generatedDataRoot)) {
  mkdirSync(distDataRoot, { recursive: true });
  cpSync(generatedDataRoot, distDataRoot, { recursive: true });
}
