const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    shouldUseDarkColors: () => ipcRenderer.invoke("dark-mode:get"),
    darkModeToggle: () => ipcRenderer.invoke("dark-mode:toggle"),
    darkModeSystem: () => ipcRenderer.invoke("dark-mode:system"),
    nodeVersion: () => process.versions.node,
    chromeVersion: () => process.versions.chrome,
    electronVersion: () => process.versions.electron,
    statusProxy: () => ipcRenderer.invoke("proxy:status"),
    startProxy: () => ipcRenderer.invoke("proxy:start"),
    stopProxy: () => ipcRenderer.invoke("proxy:stop"),
});
