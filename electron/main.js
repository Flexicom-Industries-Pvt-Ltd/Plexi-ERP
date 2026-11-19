const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// Prevent multiple instances of the desktop application
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;

// Determine target central CRM URL
const DEFAULT_URL = app.isPackaged
  ? "https://plexi-erp-two.vercel.app"
  : "http://localhost:3000";

function getServerConfigPath() {
  return path.join(app.getPath("userData"), "server-config.json");
}

function getTargetUrl() {
  if (process.env.PLEXI_APP_URL) return process.env.PLEXI_APP_URL;
  try {
    const raw = fs.readFileSync(getServerConfigPath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed.serverUrl && typeof parsed.serverUrl === "string") {
      return parsed.serverUrl.trim();
    }
  } catch {}
  return DEFAULT_URL;
}

function setTargetUrl(newUrl) {
  try {
    fs.writeFileSync(getServerConfigPath(), JSON.stringify({ serverUrl: newUrl }), "utf-8");
  } catch (err) {
    console.error("Failed to save server config:", err);
  }
}

// Path to persist window bounds between sessions
function getWindowStatePath() {
  return path.join(app.getPath("userData"), "window-state.json");
}

function loadWindowState() {
  try {
    const data = fs.readFileSync(getWindowStatePath(), "utf-8");
    return JSON.parse(data);
  } catch {
    return { width: 1440, height: 900, isMaximized: false };
  }
}

function saveWindowState(state) {
  try {
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state), "utf-8");
  } catch (err) {
    console.error("Failed to persist window state:", err);
  }
}

function createWindow() {
  const windowState = loadWindowState();

  // Strip default application menu (removes File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);

  const iconPath = path.join(__dirname, "assets", "icon.ico");

  mainWindow = new BrowserWindow({
    title: "Plexi ERP - Flexicom Industries",
    width: windowState.width || 1440,
    height: windowState.height || 900,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true, // Completely hides the menu strip on Windows & Linux
    backgroundColor: "#0f172a",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false, // Prevents white flash before initial load
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Gracefully reveal window once ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Track window size and position persistence
  mainWindow.on("close", () => {
    if (!mainWindow.isDestroyed()) {
      const isMaximized = mainWindow.isMaximized();
      if (!isMaximized) {
        const bounds = mainWindow.getBounds();
        saveWindowState({ ...bounds, isMaximized: false });
      } else {
        saveWindowState({ isMaximized: true });
      }
    }
  });

  // Intercept external links and open them in the user's default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      // If external destination (not Plexi domain), launch in default browser
      if (
        !url.includes("localhost") &&
        !url.includes("plexi-erp-two.vercel.app") &&
        !url.includes("plexi-erp-plascom.vercel.app") &&
        !url.includes("plexi-erp.flexicom.in") &&
        !url.includes("vercel.app")
      ) {
        shell.openExternal(url);
        return { action: "deny" };
      }
    }
    return { action: "allow" };
  });

  // Handle network failure or unreachable server with offline recovery page
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    // Ignore aborted loads (e.g. user navigation or redirect)
    if (errorCode === -3) return;
    if (validatedURL && validatedURL.includes("offline.html")) return;

    console.warn(`Plexi ERP failed to load (${errorCode}): ${errorDescription} for ${validatedURL}`);
    const offlinePath = path.join(__dirname, "offline.html");
    if (fs.existsSync(offlinePath)) {
      mainWindow.loadFile(offlinePath);
    }
  });

  // Append desktop identification to User-Agent
  const baseUa = mainWindow.webContents.getUserAgent();
  mainWindow.webContents.setUserAgent(`${baseUa} PlexiERP-Desktop/${app.getVersion()}`);

  mainWindow.loadURL(getTargetUrl());
}

// Ensure single instance activation
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  createWindow();

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

// IPC communication endpoints for desktop integration
ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("get-server-url", () => getTargetUrl());
ipcMain.handle("get-default-server-url", () => DEFAULT_URL);
ipcMain.handle("set-server-url", (event, newUrl) => {
  if (newUrl && typeof newUrl === "string") {
    const sanitized = newUrl.trim();
    setTargetUrl(sanitized);
    if (mainWindow) {
      mainWindow.loadURL(sanitized);
    }
    return true;
  }
  return false;
});
ipcMain.handle("retry-connection", () => {
  if (mainWindow) {
    mainWindow.loadURL(getTargetUrl());
  }
});
