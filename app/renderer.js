const pages = {
    analyzer: "./components/analyzer/analyzer.html",
    client: "./components/client/client.html",
    crawler: "./components/crawler/crawler.html",
    dashboard: "./components/dashboard/dashboard.html",
    proxy: "./components/proxy/proxy.html",
    target: "./components/target/target.html",
    utilities: "./components/utilities/utilities.html",
};

top.pages = pages;
top.currentPage = "dashboard";

top.openPage = (page) => {
    top.currentPage = page;
    top.updateNavigation();
    document.getElementById("content-frame").src = pages[top.currentPage];
};
