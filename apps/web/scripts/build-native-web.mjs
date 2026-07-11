import { spawnSync } from "node:child_process";

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
