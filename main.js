const { app, BrowserWindow } = require("electron");

const { buildAndSetApplicationMenu } = require("./app/electron/mainMenu");
const { createMainWindow } = require("./app/electron/mainWindow");

buildAndSetApplicationMenu();

app.whenReady().then(createMainWindow);

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
