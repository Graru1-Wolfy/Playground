const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const installerArgs = new Set([
  "--squirrel-install",
  "--squirrel-updated",
  "--squirrel-uninstall",
  "--squirrel-obsolete",
  "--updated",
]);

if (process.argv.some((arg) => installerArgs.has(arg))) {
  app.quit();
  process.exit(0);
}

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
  process.exit(0);
}

const isPackaged = app.isPackaged;

const packageRoot = isPackaged
  ? path.join(process.resourcesPath, "packages")
  : path.resolve(__dirname, "..", "..", "packages");

const generatedRoot = () => path.join(app.getPath("userData"), "generated-setups", "generated");
const precomputeRoot = () => path.join(app.getPath("userData"), "generated-setups", "precompute");

const heightBucket = (height) => {
  const base = Math.floor(height / 100) * 100;
  return `${String(base).padStart(3, "0")}to${String(base + 99).padStart(3, "0")}`;
};

const parseHeightRange = (raw) => {
  const text = String(raw ?? "").trim();
  if (!/^[0-9]+([:-][0-9]+)?$/.test(text)) {
    throw new Error("Enter a height or range like 64, 0-99, or 100:199.");
  }
  const normalized = text.replace(":", "-");
  const [startText, endText = startText] = normalized.split("-");
  const start = Number(startText);
  const end = Number(endText);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
    throw new Error("Height range must be non-negative and ordered.");
  }
  if (end - start + 1 > 100) {
    throw new Error("In-app generation is limited to 100 heights at a time.");
  }
  return { text, start, end };
};

const pythonCandidates = process.platform === "win32"
  ? [
      { command: "py", args: ["-3"] },
      { command: "python", args: [] },
      { command: "python3", args: [] },
    ]
  : [
      { command: "python3", args: [] },
      { command: "python", args: [] },
    ];

const runPython = (candidate, args, options) =>
  new Promise((resolve) => {
    const child = spawn(candidate.command, [...candidate.args, ...args], {
      ...options,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ ok: false, code: -1, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, code: code ?? -1, stdout, stderr });
    });
  });

const generatorEnv = () => {
  const engineSimSrc = path.join(packageRoot, "engine-sim", "src");
  const tf2SimSrc = path.join(packageRoot, "tf2sim", "src");
  const existingPythonPath = process.env.PYTHONPATH ? `${path.delimiter}${process.env.PYTHONPATH}` : "";
  return {
    ...process.env,
    PYTHONPATH: `${engineSimSrc}${path.delimiter}${tf2SimSrc}${existingPythonPath}`,
  };
};

ipcMain.handle("ranked-setups:generate", async (_event, heightRange) => {
  let parsed;
  try {
    parsed = parseHeightRange(heightRange);
  } catch (error) {
    return { ok: false, error: error.message };
  }

  await fsp.mkdir(generatedRoot(), { recursive: true });
  await fsp.mkdir(precomputeRoot(), { recursive: true });

  const args = [
    "-m",
    "engine_sim.cli",
    "--range",
    parsed.text,
    "--workers",
    "1",
    "--data-root",
    generatedRoot(),
    "--precompute-root",
    precomputeRoot(),
  ];
  const options = {
    cwd: isPackaged ? process.resourcesPath : path.resolve(__dirname, "..", ".."),
    env: generatorEnv(),
  };

  const attempts = [];
  for (const candidate of pythonCandidates) {
    const result = await runPython(candidate, args, options);
    attempts.push({ command: [candidate.command, ...candidate.args].join(" "), ...result });
    if (result.ok) {
      return {
        ok: true,
        heightRange: parsed.text,
        dataRoot: generatedRoot(),
        log: result.stdout || result.stderr,
      };
    }
  }

  return {
    ok: false,
    error: "Could not run Python generator. Install Python 3 or use the local npm command.",
    attempts,
  };
});

ipcMain.handle("ranked-setups:load", async (_event, height) => {
  const numericHeight = Number(height);
  if (!Number.isSafeInteger(numericHeight) || numericHeight < 0) {
    return { ok: false, error: "Invalid height" };
  }

  const filePath = path.join(generatedRoot(), heightBucket(numericHeight), `${numericHeight}.bin.gz`);
  try {
    const buffer = await fsp.readFile(filePath);
    return { ok: true, data: Array.from(buffer) };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { ok: false, missing: true };
    }
    return { ok: false, error: error.message };
  }
});

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0c0f14",
    title: "TF2 Bounce Checker",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: true,
    },
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
};

app.whenReady().then(() => {
  createWindow();

  app.on("second-instance", () => {
    const [mainWindow] = BrowserWindow.getAllWindows();
    if (!mainWindow) {
      createWindow();
      return;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
