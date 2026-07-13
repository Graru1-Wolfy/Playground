const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bounceNative", {
  canGenerateRankedSetups: true,
  generateRankedSetups: (heightRange) => ipcRenderer.invoke("ranked-setups:generate", heightRange),
  loadGeneratedSetup: (height) => ipcRenderer.invoke("ranked-setups:load", height),
});
