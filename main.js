const { app, BrowserWindow, ipcMain, nativeTheme } = require("electron");
const path = require("path");

const createWindow = () => {
    const win = new BrowserWindow({
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            contextIsolation: true,
            sandbox: true,
            preload: path.join(app.getAppPath(), "app/preload.js"),
        },
    });

    win.loadFile("app/index.html");

    // Open the DevTools.
    win.webContents.openDevTools();

    // dark mode
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

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
