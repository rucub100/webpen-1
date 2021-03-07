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
    const address = document.getElementById("proxy-address").value;
    const port = document.getElementById("proxy-port").value;
    if (toggle) {
        if (!statusProxy) {
            await top.electron.startProxy(address, port);
        } else {
            await top.electron.stopProxy();
        }
        statusProxy = await top.electron.statusProxy();
    }

    const toggleProxyIcon = document.querySelector("#toggle-proxy>svg");
    const toggleProxyText = document.querySelector("#toggle-proxy>span");
    if (toggleProxyIcon) {
        toggleProxyIcon.classList.remove(statusProxy ? "fa-play" : "fa-stop");
        toggleProxyIcon.classList.add(!statusProxy ? "fa-play" : "fa-stop");
    }
    toggleProxyText.innerHTML = statusProxy ? "stop" : "start";
};

const toggleInterceptor = async (toggle = true) => {
    let intercept = await top.electron.getProxyIntercept();

    if (toggle) {
        await top.electron.setProxyIntercept(!intercept);
        intercept = await top.electron.getProxyIntercept();
    }

    const toggleInterceptorIcon = document.querySelector(
        "#toggle-interceptor>svg"
    );
    const toggleInterceptorText = document.querySelector(
        "#toggle-interceptor>span"
    );
    if (toggleInterceptorIcon) {
        toggleInterceptorIcon.classList.remove(
            intercept ? "fa-toggle-on" : "fa-toggle-off"
        );
        toggleInterceptorIcon.classList.add(
            !intercept ? "fa-toggle-off" : "fa-toggle-on"
        );
    }
    toggleInterceptorText.innerHTML = intercept ? "disable" : "enable";
};

document
    .getElementById("toggle-proxy")
    .addEventListener("click", () => toggleProxyStatus());

document.getElementById(
    "monaco-editor"
).style.backgroundColor = !!top.isDarkMode ? "rgb(30, 30, 30)" : "white";

window.onload = () => {
    openTab(top.proxy.tab);
    toggleProxyStatus(false);
    toggleInterceptor(false);
};
