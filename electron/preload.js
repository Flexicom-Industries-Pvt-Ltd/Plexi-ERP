const { contextBridge, ipcRenderer } = require("electron");

// Explicit runtime marker indicating running inside Electron desktop shell
window.__IS_ELECTRON__ = true;

contextBridge.exposeInMainWorld("electron", {
  isElectron: true,
  getVersion: () => ipcRenderer.invoke("get-app-version"),
  retryConnection: () => ipcRenderer.invoke("retry-connection"),
});
