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
        if (!statusProxy) {
            await top.electron.setProxyIntercept(!intercept);
            toggleInterceptor(false);
            top.proxy.message = null;
            this.editor.getModel().setValue("");
        }
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
        top.proxy.message = null;
        await top.electron.setProxyIntercept(!intercept);
        intercept = await top.electron.getProxyIntercept();
        this.editor.getModel().setValue("");
        readInterceptedMessage();
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

const acceptMessage = async () => {
    await top.electron.acceptNextInterceptedMessage(this.editor.getValue());
    top.proxy.message = null;
    this.editor.getModel().setValue("");
    readInterceptedMessage();
};

const dropMessage = async () => {
    await top.electron.acceptNextInterceptedMessage();
    top.proxy.message = null;
    this.editor.getModel().setValue("");
    readInterceptedMessage();
};

const _formatRequest = (request) => {
    let formattedRequest =
        request.method +
        " " +
        request.url +
        " HTTP/" +
        request.httpVersion +
        "\r\n";

    for (let i = 0; i < request.rawHeaders.length; i += 2) {
        formattedRequest +=
            request.rawHeaders[i] + ": " + request.rawHeaders[i + 1] + "\r\n";
    }

    if (request.body) {
        formattedRequest += "\r\n";
        formattedRequest += request.body;
    }

    return formattedRequest;
};

const readInterceptedMessage = async () => {
    if (top.proxy.message) {
        return;
    }

    const next = await top.electron.getNextInterceptedMessage();
    if (next.type === "request" || next.type === "response") {
        top.proxy.message =
            next.type === "request"
                ? _formatRequest(next[next.type])
                : JSON.stringify(next[next.type]);
        this.editor.getModel().setValue(top.proxy.message);
    } else {
        setTimeout(readInterceptedMessage, 200);
    }
};

document
    .getElementById("toggle-proxy")
    .addEventListener("click", () => toggleProxyStatus());

document.getElementById(
    "monaco-editor"
).style.backgroundColor = !!top.isDarkMode ? "rgb(30, 30, 30)" : "white";

window.onload = () => {
    openTab(top.proxy.tab);
    readInterceptedMessage();
    toggleProxyStatus(false);
    toggleInterceptor(false);
};
