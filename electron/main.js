const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { initAutoUpdater } = require("./updater");

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
    frame: false, // Frameless window for custom titlebar (Option 2)
    autoHideMenuBar: true, // Completely hides the menu strip on Windows & Linux
    backgroundColor: "#0f172a",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false, // Prevents white flash before initial load
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true, // ERP-016: Enable renderer sandbox
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

  // Track window maximized states and broadcast to renderer
  mainWindow.on("maximize", () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("window-maximized-change", true);
    }
  });

  mainWindow.on("unmaximize", () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("window-maximized-change", false);
    }
  });

  const ALLOWED_HOSTS = new Set([
    "localhost",
    "127.0.0.1",
    "plexi-erp-two.vercel.app",
    "plexi-erp-plascom.vercel.app",
    "plexi-erp.flexicom.in",
  ]);

  function isAuthorizedUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") return false;
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
      const host = parsed.hostname.toLowerCase();
      if (ALLOWED_HOSTS.has(host)) return true;
      if (host.endsWith(".vercel.app") && host.startsWith("plexi-erp")) return true;
      return false;
    } catch {
      return false;
    }
  }

  // Intercept external links and open them in the user's default OS browser (ERP-017)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAuthorizedUrl(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Intercept top-level navigation to prevent redirect to untrusted origins
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isAuthorizedUrl(url) && !url.includes("offline.html")) {
      event.preventDefault();
      shell.openExternal(url);
    }
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
  initAutoUpdater(mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      initAutoUpdater(mainWindow);
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
  // Validate sender frame origin (ERP-032)
  if (event.senderFrame && event.senderFrame.url) {
    if (!isAuthorizedUrl(event.senderFrame.url) && !event.senderFrame.url.includes("offline.html")) {
      console.warn("Rejected set-server-url from untrusted frame:", event.senderFrame.url);
      return false;
    }
  }

  if (newUrl && typeof newUrl === "string") {
    const sanitized = newUrl.trim();
    if (!isAuthorizedUrl(sanitized)) {
      console.warn("Rejected set-server-url to unauthorized destination:", sanitized);
      return false;
    }
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

function isAuthorizedSenderFrame(event) {
  if (!event || !event.senderFrame || !event.senderFrame.url) return false;
  const senderUrl = event.senderFrame.url;
  if (senderUrl.includes("offline.html")) return false;
  try {
    const parsed = new URL(senderUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "plexi-erp-two.vercel.app" ||
      host === "plexi-erp-plascom.vercel.app" ||
      host === "plexi-erp.flexicom.in" ||
      (host.endsWith(".vercel.app") && host.startsWith("plexi-erp"))
    );
  } catch {
    return false;
  }
}

ipcMain.handle("generate-pdf-from-html", async (event, payload) => {
  if (!isAuthorizedSenderFrame(event)) {
    return { ok: false, error: "Unauthorized sender frame" };
  }
  const html = payload && typeof payload.html === "string" ? payload.html : "";
  const rawName = payload && typeof payload.fileName === "string" ? payload.fileName : "report.pdf";
  if (!html || html.length > 5_000_000) {
    return { ok: false, error: "Invalid report HTML" };
  }

  const baseName = path.basename(rawName).replace(/[^a-zA-Z0-9._-]/g, "_") || "report.pdf";
  const safeFileName = baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`;
  const isLandscape = /size:\s*A4\s+landscape/i.test(html);

  let pdfWin = null;
  try {
    pdfWin = new BrowserWindow({
      show: false,
      width: isLandscape ? 1123 : 794,
      height: isLandscape ? 794 : 1123,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        javascript: false,
      },
    });

    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdfBuffer = await pdfWin.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      landscape: isLandscape,
      pageSize: "A4",
    });

    const downloadsDir = app.getPath("downloads");
    const targetPath = path.join(downloadsDir, safeFileName);
    await fs.promises.writeFile(targetPath, pdfBuffer);
    shell.showItemInFolder(targetPath);

    return { ok: true, filePath: targetPath, fileName: safeFileName };
  } catch (err) {
    console.error("generate-pdf-from-html failed:", err);
    return { ok: false, error: err && err.message ? err.message : "PDF generation failed" };
  } finally {
    if (pdfWin && !pdfWin.isDestroyed()) {
      pdfWin.destroy();
    }
  }
});

ipcMain.handle("open-whatsapp-url", async (event, rawUrl) => {
  if (!isAuthorizedSenderFrame(event) || typeof rawUrl !== "string") {
    return false;
  }
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host !== "api.whatsapp.com" &&
      host !== "wa.me" &&
      host !== "web.whatsapp.com"
    ) {
      return false;
    }
    await shell.openExternal(parsed.toString());
    return true;
  } catch {
    return false;
  }
});

// Custom window control handlers (Option 2 frameless)
ipcMain.handle("window-minimize", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});
ipcMain.handle("window-maximize", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});
ipcMain.handle("window-close", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});
ipcMain.handle("window-is-maximized", () => {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
});
