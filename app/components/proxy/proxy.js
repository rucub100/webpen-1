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
            await top.electron.setProxyIntercept(false);
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

    const toggleInterceptorTablink = document.querySelector(
        "#interceptor-tablink>svg"
    );
    const toggleInterceptorIcon = document.querySelector(
        "#toggle-interceptor>svg"
    );
    const toggleInterceptorText = document.querySelector(
        "#toggle-interceptor>span"
    );
    if (toggleInterceptorTablink) {
        toggleInterceptorTablink.classList.remove(
            intercept ? "fa-eye" : "fa-eye-slash"
        );
        toggleInterceptorTablink.classList.add(
            !intercept ? "fa-eye-slash" : "fa-eye"
        );
    }
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

const _parseRequestLine = (line, message) => {
    const requestLine = line
        .split(/\s/g)
        .filter((x) => x.trim().length > 0)
        .map((x) => x.trim());

    if (requestLine.length === 3) {
        message.method = requestLine[0];
        message.url = requestLine[1];
        message.httpVersion = requestLine[2].split("/")[1];
    }
};

const _parseHeader = (line, message) => {
    const header = line.split(":");

    if (header.length >= 2) {
        message.rawHeaders.push(header[0].trim());
        message.rawHeaders.push(header.slice(1).join().trim());
    }
};

const _parseBody = (body, message) => {
    message.rawBody = body.join("\r\n");
};

const _parseMessage = (value) => {
    const message = { ...top.proxy.messageRaw };

    if (top.proxy.messageType === "request") {
        const lines = value.split("\r\n");
        if (lines.length > 2) {
            // parse headers
            message.rawHeaders = [];
            for (let i = 0; i < lines.length; i++) {
                // parse request line
                if (i === 0) {
                    _parseRequestLine(lines[i], message);
                }

                // detect end of HTTP headers
                if (lines[i] === "") {
                    _parseBody(lines.slice(i + 1, lines.length), message);
                    break;
                }

                _parseHeader(lines[i], message);
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
