const { app, BrowserWindow, shell } = require("electron");
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
