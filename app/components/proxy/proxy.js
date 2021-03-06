const defaultTab = "interceptor";
if (!top.proxy) {
    top.proxy = { tab: defaultTab };
} else if (!top.proxy.tab) {
    top.proxy.tab = defaultTab;
}

const openTab = (tab) => {
    const tabLinks = document.getElementsByClassName("tablink");
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].classList.remove("active");
    }

    const tabContent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabContent.length; i++) {
        tabContent[i].style.display = "none";
    }

    top.proxy.tab = tab;
    document.getElementById(tab + "-tablink").classList.add("active");
    document.getElementById(tab).style.display = "flex";
};

const toggleProxyStatus = async (toggle = true) => {
    let statusProxy = await top.electron.statusProxy();
    if (toggle) {
        if (!statusProxy) {
            await top.electron.startProxy();
        } else {
            await top.electron.stopProxy();
        }
        statusProxy = await top.electron.statusProxy();
    }

    const toggleProxyIcon = document.querySelector("#toggle-proxy>svg");
    if (toggleProxyIcon) {
        toggleProxyIcon.classList.remove(statusProxy ? "fa-play" : "fa-stop");
        toggleProxyIcon.classList.add(!statusProxy ? "fa-play" : "fa-stop");
    }
};

openTab(top.proxy.tab);

document
    .getElementById("toggle-proxy")
    .addEventListener("click", () => toggleProxyStatus());

document.getElementById(
    "monaco-editor"
).style.backgroundColor = !!top.isDarkMode ? "rgb(30, 30, 30)" : "white";
