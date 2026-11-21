/* eslint-disable @typescript-eslint/no-require-imports */
let electronApp = null;
let electronIpc = null;
try {
  const electron = require("electron");
  electronApp = electron.app;
  electronIpc = electron.ipcMain;
} catch {
  // Graceful fallback for non-Electron test environments
}

const https = require("https");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const GITHUB_REPO_OWNER = "Flexicom-Industries-Pvt-Ltd";
const GITHUB_REPO_NAME = "Plexi-ERP";

let currentUpdateState = {
  state: "idle", // 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'
  version: null,
  percent: 0,
  installerPath: null,
  error: null,
};

function broadcastState(mainWindow) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status-change", currentUpdateState);
  }
}

function parseSemver(ver) {
  if (!ver) return [0, 0, 0];
  const cleaned = ver.trim().replace(/^v/i, "");
  const parts = cleaned.split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function isNewerVersion(remoteVer, currentVer) {
  const [rMaj, rMin, rPatch] = parseSemver(remoteVer);
  const [cMaj, cMin, cPatch] = parseSemver(currentVer);

  if (rMaj > cMaj) return true;
  if (rMaj < cMaj) return false;
  if (rMin > cMin) return true;
  if (rMin < cMin) return false;
  return rPatch > cPatch;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Plexi-ERP-AutoUpdater",
        Accept: "application/vnd.github.v3+json",
      },
    };

    https
      .get(url, options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchJson(res.headers.location).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`GitHub API responded with status ${res.statusCode}`));
        }

        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(rawData));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "Plexi-ERP-AutoUpdater",
          Accept: "application/octet-stream",
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadFile(res.headers.location, destPath, onProgress).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers["content-length"] || "0", 10);
        let receivedBytes = 0;
        let lastReportTime = 0;

        const fileStream = fs.createWriteStream(destPath);

        res.on("data", (chunk) => {
          receivedBytes += chunk.length;
          const now = Date.now();
          if (now - lastReportTime > 250 || receivedBytes === totalBytes) {
            lastReportTime = now;
            const percent = totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0;
            onProgress({ receivedBytes, totalBytes, percent });
          }
        });

        res.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close(() => {
            resolve(destPath);
          });
        });

        fileStream.on("error", (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      }
    );

    request.on("error", (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function checkForUpdates(mainWindow) {
  if (currentUpdateState.state === "downloading" || currentUpdateState.state === "downloaded") {
    broadcastState(mainWindow);
    return currentUpdateState;
  }

  currentUpdateState = {
    ...currentUpdateState,
    state: "checking",
    error: null,
  };
  broadcastState(mainWindow);

  try {
    const releaseUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;
    const release = await fetchJson(releaseUrl);

    if (!release || !release.tag_name) {
      currentUpdateState = { ...currentUpdateState, state: "idle" };
      broadcastState(mainWindow);
      return currentUpdateState;
    }

    const remoteVersion = release.tag_name.replace(/^v/i, "");
    const localVersion = electronApp ? electronApp.getVersion() : "0.1.0";

    if (!isNewerVersion(remoteVersion, localVersion)) {
      currentUpdateState = {
        state: "idle",
        version: localVersion,
        percent: 0,
        installerPath: null,
        error: null,
      };
      broadcastState(mainWindow);
      return currentUpdateState;
    }

    // Find the Windows installer asset (.exe)
    const asset = (release.assets || []).find((a) => a.name.endsWith(".exe") && !a.name.includes("blockmap"));
    if (!asset || !asset.browser_download_url) {
      currentUpdateState = { ...currentUpdateState, state: "idle" };
      broadcastState(mainWindow);
      return currentUpdateState;
    }

    // Update found! Start background download
    currentUpdateState = {
      state: "available",
      version: remoteVersion,
      percent: 0,
      installerPath: null,
      error: null,
    };
    broadcastState(mainWindow);

    startDownload(mainWindow, asset.browser_download_url, remoteVersion);
  } catch (err) {
    currentUpdateState = {
      state: "error",
      version: null,
      percent: 0,
      installerPath: null,
      error: err.message,
    };
    broadcastState(mainWindow);
  }

  return currentUpdateState;
}

async function startDownload(mainWindow, downloadUrl, remoteVersion) {
  currentUpdateState = {
    state: "downloading",
    version: remoteVersion,
    percent: 0,
    installerPath: null,
    error: null,
  };
  broadcastState(mainWindow);

  try {
    const tempDir = electronApp ? electronApp.getPath("temp") : (process.env.TEMP || ".");
    const installerFile = path.join(tempDir, `Plexi-ERP-Setup-${remoteVersion}.exe`);

    await downloadFile(downloadUrl, installerFile, ({ percent }) => {
      currentUpdateState = {
        state: "downloading",
        version: remoteVersion,
        percent,
        installerPath: null,
        error: null,
      };
      broadcastState(mainWindow);
    });

    currentUpdateState = {
      state: "downloaded",
      version: remoteVersion,
      percent: 100,
      installerPath: installerFile,
      error: null,
    };
    broadcastState(mainWindow);
  } catch (err) {
    currentUpdateState = {
      state: "error",
      version: remoteVersion,
      percent: 0,
      installerPath: null,
      error: err.message,
    };
    broadcastState(mainWindow);
  }
}

function applyUpdate() {
  if (currentUpdateState.state !== "downloaded" || !currentUpdateState.installerPath) {
    return false;
  }

  const installerPath = currentUpdateState.installerPath;
  if (!fs.existsSync(installerPath)) {
    return false;
  }

  // Launch installer detached so it continues after app exits
  try {
    const child = spawn(installerPath, [], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    if (electronApp) {
      setTimeout(() => {
        electronApp.quit();
      }, 500);
    }

    return true;
  } catch {
    return false;
  }
}

function initAutoUpdater(mainWindow) {
  if (!electronIpc) return;

  // IPC Handlers
  electronIpc.handle("check-for-updates", () => checkForUpdates(mainWindow));
  electronIpc.handle("get-update-status", () => currentUpdateState);
  electronIpc.handle("apply-update", () => applyUpdate());

  // Automatically check 5 seconds after startup
  setTimeout(() => {
    checkForUpdates(mainWindow).catch(() => {});
  }, 5000);

  // Periodic check every 30 minutes
  setInterval(() => {
    checkForUpdates(mainWindow).catch(() => {});
  }, 30 * 60 * 1000);
}

module.exports = {
  initAutoUpdater,
  checkForUpdates,
  applyUpdate,
  parseSemver,
  isNewerVersion,
};
