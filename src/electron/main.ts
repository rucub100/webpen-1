const { app, BrowserWindow } = require("electron");

const { buildAndSetApplicationMenu } = require("./mainMenu");
const { createMainWindow } = require("./mainWindow");
const { stopProxy, startProxy } = require("../app/services/proxy.service");

require("../app/services/target.service");

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
