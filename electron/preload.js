const { contextBridge, ipcRenderer } = require("electron");

// Explicit runtime marker indicating running inside Electron desktop shell
window.__IS_ELECTRON__ = true;

contextBridge.exposeInMainWorld("electron", {
  isElectron: true,
  getVersion: () => ipcRenderer.invoke("get-app-version"),
  getServerUrl: () => ipcRenderer.invoke("get-server-url"),
  getDefaultServerUrl: () => ipcRenderer.invoke("get-default-server-url"),
  setServerUrl: (url) => ipcRenderer.invoke("set-server-url", url),
  retryConnection: () => ipcRenderer.invoke("retry-connection"),
});
