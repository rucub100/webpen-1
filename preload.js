const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    darkModeToggle: async () => ipcRenderer.invoke("dark-mode:toggle"),
    darkModeSystem: async () => ipcRenderer.invoke("dark-mode:system"),
    nodeVersion: () => process.versions.node,
    chromeVersion: () => process.versions.chrome,
    electronVersion: () => process.versions.electron,
});
