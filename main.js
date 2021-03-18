const { app, BrowserWindow } = require("electron");

const global = {};

const { buildAndSetApplicationMenu } = require("./app/electron/mainMenu");
const { createMainWindow } = require("./app/electron/mainWindow");
const { stopProxy, startProxy } = require("./app/services/proxy.service");

buildAndSetApplicationMenu();

startProxy();

app.whenReady().then(createMainWindow);

app.on("quit", () => {
    stopProxy();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});
