const pages = {
    analyzer: "./components/analyzer/analyzer.html",
    client: "./components/client/client.html",
    crawler: "./components/crawler/crawler.html",
    dashboard: "./components/dashboard/dashboard.html",
    proxy: "./components/proxy/proxy.html",
    target: "./components/target/target.html",
    utilities: "./components/utilities/utilities.html",
};
const explorerListeners = [];

top.pages = pages;
top.currentPage = "dashboard";
top.explorer = {
    show: true,
    addListener: (listener) => explorerListeners.push(listener),
};

top.openPage = (page) => {
    top.currentPage = page;
    top.updateNavigation();
    document.getElementById("content-frame").src = pages[top.currentPage];
};

top.electron.shouldUseDarkColors().then((dark) => {
    top.isDarkMode = dark;
});

top.darkModeToggle = async () => {
    top.isDarkMode = await top.electron.darkModeToggle();
    return top.isDarkMode;
};

top.darkModeSystem = async () => {
    await top.electron.darkModeSystem();
    top.isDarkMode = await top.electron.shouldUseDarkColors();
    return top.isDarkMode;
};

document.getElementById("icon").addEventListener("click", () => {
    top.explorer.show = !top.explorer.show;

    explorerListeners.forEach((listener) => listener(top.explorer.show));

    if (!top.explorer.show) {
        document.getElementById("navigationList").style.paddingLeft = "0";
        document.getElementById("navigationList").style.paddingRight = "0";
        document.getElementById("navigation").style.minWidth = "7.2ch";
        document.getElementById("navigation").style.width = "7.2ch";
        document.getElementById("icon").style.transform =
            "translate(-18.5ch, 0px)";
    } else {
        document.getElementById("navigationList").style.paddingLeft = "";
        document.getElementById("navigationList").style.paddingRight = "";
        document.getElementById("navigation").style.minWidth = "";
        document.getElementById("navigation").style.width = "";
        document.getElementById("icon").style.transform = "";
    }
});
