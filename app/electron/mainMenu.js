const { Menu } = require("electron");

const isMac = process.platform === "darwin";

const mainMenuTemplate = [
    {
        role: "appMenu",
        label: "Web&pen",
        accelerator: isMac ? "Command+Q" : "Control+Q",
        submenu: [{ role: "quit" }],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
    {
        role: "help",
        label: "&Help",
        submenu: [{ role: "about" }],
    },
];

module.exports = {
    buildAndSetApplicationMenu: () => {
        const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
        Menu.setApplicationMenu(mainMenu);
    },
};
