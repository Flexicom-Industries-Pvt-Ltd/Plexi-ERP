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

  // Custom frameless window controls
  minimize: () => ipcRenderer.invoke("window-minimize"),
  maximize: () => ipcRenderer.invoke("window-maximize"),
  close: () => ipcRenderer.invoke("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  onMaximizedChange: (callback) => {
    if (typeof callback !== "function") return () => {};
    const subscription = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on("window-maximized-change", subscription);
    return () => ipcRenderer.removeListener("window-maximized-change", subscription);
  },

  // Auto-updater integration
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  getUpdateStatus: () => ipcRenderer.invoke("get-update-status"),
  applyUpdate: () => ipcRenderer.invoke("apply-update"),
  onUpdateStatusChange: (callback) => {
    if (typeof callback !== "function") return () => {};
    const subscription = (_event, status) => callback(status);
    ipcRenderer.on("update-status-change", subscription);
    return () => ipcRenderer.removeListener("update-status-change", subscription);
  },

  // Vector PDF export & external WhatsApp handoff
  generatePdfFromHtml: (html, fileName) =>
    ipcRenderer.invoke("generate-pdf-from-html", { html, fileName }),
  openWhatsAppUrl: (url) => ipcRenderer.invoke("open-whatsapp-url", url),
});

// Immediately inject desktop titlebar CSS variable into DOM
window.addEventListener("DOMContentLoaded", () => {
  if (document && document.documentElement) {
    document.documentElement.style.setProperty("--titlebar-height", "36px");
  }
});
