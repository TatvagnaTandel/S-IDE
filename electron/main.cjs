const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const childProcess = require("node:child_process");

let mainWindow = null;
let activeShell = null;

const IGNORED_NAMES = new Set([
  ".git",
  "node_modules",
  ".DS_Store",
  "dist",
  ".taste-skill",
]);

async function scanDirectory(dirPath, maxDepth = 4, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const items = [];

    for (const entry of entries) {
      if (IGNORED_NAMES.has(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const children = await scanDirectory(fullPath, maxDepth, currentDepth + 1);
        items.push({
          name: entry.name,
          path: fullPath,
          isDirectory: true,
          children,
        });
      } else if (entry.isFile()) {
        items.push({
          name: entry.name,
          path: fullPath,
          isDirectory: false,
        });
      }
    }

    // Sort: directories first, then alphabetical
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return items;
  } catch (error) {
    console.error("Failed to scan directory:", error);
    return [];
  }
}

function startTerminalProcess(cwd = process.env.HOME || "/") {
  if (activeShell) {
    try {
      activeShell.kill();
    } catch {}
    activeShell = null;
  }

  const shellBinary = process.env.SHELL || "/bin/zsh";
  try {
    activeShell = childProcess.spawn(shellBinary, ["-l"], {
      cwd: fs.existsSync(cwd) ? cwd : process.env.HOME,
      env: {
        ...process.env,
        TERM: "xterm-256color",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    activeShell.stdout.on("data", (chunk) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("terminal:output", chunk.toString("utf-8"));
      }
    });

    activeShell.stderr.on("data", (chunk) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("terminal:output", chunk.toString("utf-8"));
      }
    });

    activeShell.on("exit", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("terminal:output", "\r\n[Shell exited]\r\n");
      }
    });

    return true;
  } catch (err) {
    console.error("Failed to spawn shell:", err);
    return false;
  }
}

function setupMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Open Folder...",
          accelerator: "CmdOrCtrl+O",
          click: () => mainWindow?.webContents.send("menu:action", "open-folder"),
        },
        {
          label: "New File",
          accelerator: "CmdOrCtrl+N",
          click: () => mainWindow?.webContents.send("menu:action", "new-file"),
        },
        {
          label: "Save File",
          accelerator: "CmdOrCtrl+S",
          click: () => mainWindow?.webContents.send("menu:action", "save-file"),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Terminal",
      submenu: [
        {
          label: "Toggle Terminal Panel",
          accelerator: "CmdOrCtrl+`",
          click: () => mainWindow?.webContents.send("menu:action", "toggle-terminal"),
        },
        {
          label: "Clear Terminal",
          click: () => mainWindow?.webContents.send("menu:action", "clear-terminal"),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 920,
    minHeight: 580,
    title: "S-IDE",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: "#171719",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "..", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (activeShell) {
      try {
        activeShell.kill();
      } catch {}
      activeShell = null;
    }
  });
}

// IPC Handlers
ipcMain.handle("dialog:openFolder", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"],
    title: "Open Folder in S-IDE",
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("fs:readDirectory", async (_event, dirPath) => {
  return await scanDirectory(dirPath);
});

ipcMain.handle("fs:readFile", async (_event, filePath) => {
  try {
    return await fs.promises.readFile(filePath, "utf-8");
  } catch (error) {
    console.error(`Failed to read file ${filePath}:`, error);
    throw error;
  }
});

ipcMain.handle("fs:writeFile", async (_event, filePath, content) => {
  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content, "utf-8");
    return true;
  } catch (error) {
    console.error(`Failed to write file ${filePath}:`, error);
    throw error;
  }
});

ipcMain.handle("fs:createFile", async (_event, filePath, content = "") => {
  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content, "utf-8");
    return true;
  } catch (error) {
    console.error(`Failed to create file ${filePath}:`, error);
    throw error;
  }
});

ipcMain.handle("fs:deleteFile", async (_event, filePath) => {
  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      await fs.promises.rm(filePath, { recursive: true, force: true });
    } else {
      await fs.promises.unlink(filePath);
    }
    return true;
  } catch (error) {
    console.error(`Failed to delete file ${filePath}:`, error);
    throw error;
  }
});

ipcMain.handle("terminal:start", async (_event, cwd) => {
  return startTerminalProcess(cwd);
});

ipcMain.on("terminal:input", (_event, data) => {
  if (activeShell && activeShell.stdin && activeShell.stdin.writable) {
    activeShell.stdin.write(data);
  }
});

app.whenReady().then(() => {
  setupMenu();
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
