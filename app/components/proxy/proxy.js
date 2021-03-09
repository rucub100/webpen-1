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
        await top.electron.setProxyIntercept(!intercept);
        intercept = await top.electron.getProxyIntercept();
        this.editor.getModel().setValue("");
        readInterceptedMessage(true);
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

const _parseMessage = (value) => {
    const message = { ...top.proxy.messageRaw };

    debugger;
    if (top.proxy.messageType === "request") {
        const lines = value.split("\r\n");
        if (lines.length > 2) {
            // parse headers
            message.rawHeaders = [];
            for (let i = 0; i < lines.length; i++) {
                if (i === 0) continue; // ignore request line
                if (lines[i] === "") break; // detect end of HTTP headers

                const header = lines[i].split(":");
                if (header.length >= 2) {
                    message.rawHeaders.push(header[0].trim());
                    message.rawHeaders.push(header.slice(1).join().trim());
                }
            }
        }
    } // TODO else parse response

    return message;
};

const acceptMessage = async () => {
    const value = this.editor.getValue();
    await top.electron.acceptNextInterceptedMessage(_parseMessage(value));
    this.editor.getModel().setValue("");
    readInterceptedMessage(true);
};

const dropMessage = async () => {
    await top.electron.dropNextInterceptedMessage();
    this.editor.getModel().setValue("");
    readInterceptedMessage(true);
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

    if (request.rawBody) {
        formattedRequest += "\r\n";
        formattedRequest += new TextDecoder().decode(request.rawBody);
    }

    return formattedRequest;
};

const _formatResponse = (response) => {
    let formattedResponse =
        "HTTP/" +
        response.httpVersion +
        " " +
        response.statusCode +
        " " +
        response.statusMessage +
        "\r\n";

    for (let i = 0; i < response.rawHeaders.length; i += 2) {
        formattedResponse +=
            response.rawHeaders[i] + ": " + response.rawHeaders[i + 1] + "\r\n";
    }

    if (response.rawBody) {
        formattedResponse += "\r\n";
        formattedResponse += new TextDecoder().decode(response.rawBody);
    }

    return formattedResponse;
};

const readInterceptedMessage = async (force = false) => {
    if (force) {
        top.proxy.messageType = null;
        top.proxy.messageRaw = null;
        top.proxy.message = null;
    }

    if (top.proxy.message) {
        return;
    }

    const next = await top.electron.getNextInterceptedMessage();
    debugger;
    if (next.type === "request" || next.type === "response") {
        top.proxy.messageType = next.type;
        top.proxy.messageRaw = next[next.type];
        top.proxy.message =
            next.type === "request"
                ? _formatRequest(next.rawMsg)
                : _formatResponse(next.rawMsg);
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
