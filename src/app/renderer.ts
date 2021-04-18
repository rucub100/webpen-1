import "./styles.css";
import "./renderer.css";
import "./static/fontawesome/js/all";

const pages: { [key: string]: string } = {
    analyzer: "./app/components/analyzer/analyzer.html",
    client: "./app/components/client/client.html",
    crawler: "./app/components/crawler/crawler.html",
    dashboard: "./app/components/dashboard/dashboard.html",
    proxy: "./app/components/proxy/proxy.html",
    target: "./app/components/target/target.html",
    utilities: "./app/components/utilities/utilities.html",
};
const explorerListeners: ((...args: any) => any)[] = [];

(top as any).pages = pages;
(top as any).currentPage = "dashboard";
(top as any).explorer = {
    show: true,
    addListener: (listener: (...args: any) => any) => explorerListeners.push(listener),
};

(top as any).openPage = (page: any) => {
    (top as any).currentPage = page;
    (top as any).updateNavigation();
    (<HTMLFrameElement>document.getElementById("content-frame")).src = pages[(top as any).currentPage];
};

(top as any).electron.shouldUseDarkColors().then((dark: boolean) => {
    (top as any).isDarkMode = dark;
});

(top as any).darkModeToggle = async () => {
    (top as any).isDarkMode = await (top as any).electron.darkModeToggle();
    return (top as any).isDarkMode;
};

(top as any).darkModeSystem = async () => {
    await (top as any).electron.darkModeSystem();
    (top as any).isDarkMode = await (top as any).electron.shouldUseDarkColors();
    return (top as any).isDarkMode;
};

document.getElementById("icon")?.addEventListener("click", () => {
    (top as any).explorer.show = !(top as any).explorer.show;

    explorerListeners.forEach((listener) => listener((top as any).explorer.show));

    if (!(top as any).explorer.show) {
        document.getElementById("navigationList")!.style.paddingLeft = "0";
        document.getElementById("navigationList")!.style.paddingRight = "0";
        document.getElementById("navigation")!.style.minWidth = "7.2ch";
        document.getElementById("navigation")!.style.width = "7.2ch";
        document.getElementById("icon")!.style.transform =
            "translate(-18.5ch, 0px)";
    } else {
        document.getElementById("navigationList")!.style.paddingLeft = "";
        document.getElementById("navigationList")!.style.paddingRight = "";
        document.getElementById("navigation")!.style.minWidth = "";
        document.getElementById("navigation")!.style.width = "";
        document.getElementById("icon")!.style.transform = "";
    }
});
