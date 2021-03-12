const { app, BrowserWindow, ipcMain, nativeTheme } = require("electron");
const path = require("path");

const createMainWindow = () => {
    const win = new BrowserWindow({
        show: false,
        minWidth: 800,
        width: 1280,
        minHeight: 600,
        height: 800,
        webPreferences: {
            contextIsolation: true,
            sandbox: true,
            preload: path.join(app.getAppPath(), "app/preload.js"),
        },
    });

    win.loadFile("app/index.html");

    win.once("ready-to-show", () => {
        win.show();
    });

    global.show = () => {
        win.show();
    };

    // Open the DevTools.
    // win.webContents.openDevTools();

    // dark mode
    ipcMain.handle("dark-mode:get", () => nativeTheme.shouldUseDarkColors);

    ipcMain.handle("dark-mode:toggle", () => {
        if (nativeTheme.shouldUseDarkColors) {
            nativeTheme.themeSource = "light";
        } else {
            nativeTheme.themeSource = "dark";
        }
        return nativeTheme.shouldUseDarkColors;
    });

    ipcMain.handle("dark-mode:system", () => {
        nativeTheme.themeSource = "system";
    });
};

module.exports = { createMainWindow };
