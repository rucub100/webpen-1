const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    darkModeToggle: () => ipcRenderer.invoke("dark-mode:toggle"),
    darkModeSystem: () => ipcRenderer.invoke("dark-mode:system"),
    nodeVersion: () => process.versions.node,
    chromeVersion: () => process.versions.chrome,
    electronVersion: () => process.versions.electron,
    startProxy: () => ipcRenderer.invoke("proxy:start"),
    stopProxy: () => ipcRenderer.invoke("proxy:stop"),
});
