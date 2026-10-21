const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,

  // Native Dialogs & Filesystem
  openFolderDialog: () => ipcRenderer.invoke("dialog:openFolder"),
  readDirectory: (dirPath) => ipcRenderer.invoke("fs:readDirectory", dirPath),
  readFile: (filePath) => ipcRenderer.invoke("fs:readFile", filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke("fs:writeFile", filePath, content),
  createFile: (filePath, content) => ipcRenderer.invoke("fs:createFile", filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke("fs:deleteFile", filePath),

  // Live Terminal & Process Execution
  startTerminal: (cwd) => ipcRenderer.invoke("terminal:start", cwd),
  sendTerminalInput: (data) => ipcRenderer.send("terminal:input", data),
  execCommand: (command, cwd) => ipcRenderer.invoke("system:exec", command, cwd),
  onTerminalOutput: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("terminal:output", handler);
    return () => ipcRenderer.removeListener("terminal:output", handler);
  },

  // Menu action dispatcher from native macOS menu
  onMenuAction: (callback) => {
    const handler = (_event, action) => callback(action);
    ipcRenderer.on("menu:action", handler);
    return () => ipcRenderer.removeListener("menu:action", handler);
  },
});
