const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    shouldUseDarkColors: () => ipcRenderer.invoke("dark-mode:get"),
    darkModeToggle: () => ipcRenderer.invoke("dark-mode:toggle"),
    darkModeSystem: () => ipcRenderer.invoke("dark-mode:system"),
    nodeVersion: () => process.versions.node,
    chromeVersion: () => process.versions.chrome,
    electronVersion: () => process.versions.electron,
    // PROXY
    statusProxy: () => ipcRenderer.invoke("proxy:status"),
    startProxy: (address: string, port: number) =>
        ipcRenderer.invoke("proxy:start", address, port),
    stopProxy: () => ipcRenderer.invoke("proxy:stop"),
    getProxyIntercept: () => ipcRenderer.invoke("proxy:intercept:get"),
    setProxyIntercept: (enable: boolean) =>
        ipcRenderer.invoke("proxy:intercept", enable),
    getNextInterceptedMessage: () => ipcRenderer.invoke("proxy:intercept:next"),
    acceptNextInterceptedMessage: (value: string) =>
        ipcRenderer.invoke("proxy:intercept:accept", value),
    dropNextInterceptedMessage: () =>
        ipcRenderer.invoke("proxy:intercept:drop"),
    // TARGET
    getTargetScope: () => ipcRenderer.invoke("target:get-scope"),
    addTargetFilter: (filter: string) =>
        ipcRenderer.invoke("target:add-filter", filter),
    deleteTargetFilter: (index: number) =>
        ipcRenderer.invoke("target:delete-filter", index),
    updateTargetFilter: (index: number, filter: string) =>
        ipcRenderer.invoke("target:update-filter", index, filter),
});
