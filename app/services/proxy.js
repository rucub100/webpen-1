const { ipcMain } = require("electron");
const httpolyglot = require("@httptoolkit/httpolyglot");
const net = require("net");
const http = require("http");
const https = require("https");
const { getCAPem, getCAPrivateKeyPem } = require("./pki");
const { URL } = require("url");

let proxy;

let intercept = false;
let proxyReqQueue = [];
let proxyResQueue = [];
let interceptReqQueue = [];
let interceptResQueue = [];
let interceptMsgQueue = [];

// #region Functions ----------------------------------------------------------

const startProxy = (address = "127.0.0.1", port = 8080) => {
    if (proxy) {
        return true;
    }

    const key = getCAPrivateKeyPem();
    const cert = getCAPem();

    console.log(key);
    console.log(cert);
    proxy = httpolyglot.createServer(
        {
            key,
            cert,
        },
        (req, res) => {
            proxyReqQueue.push({ req, res });
        }
    );

    proxy
        .listen({ host: address, port }, () => {
            console.log("opened server(proxy) on ", proxy.address());
        })
        .on("connect", (req, clientSocket, head) => {
            const serverSocket = net.connect(port || 80, address, () => {
                clientSocket.write(
                    "HTTP/1.1 200 Connection Established\r\n" +
                        "Proxy-agent: Node.js-Proxy\r\n" +
                        "\r\n"
                );
                serverSocket.write(head);
                serverSocket.pipe(clientSocket);
                clientSocket.pipe(serverSocket);
            });
        })
        .on("error", (error) => {
            proxy = null;
            console.error(error);
        });

    return true;
};

const stopProxy = () => {
    if (!proxy) {
        return false;
    }

    const address = proxy.address();
    proxy.close(() => {
        console.log("closed server(proxy) on ", address);
        intercept = false;
        proxyReqQueue = [];
        proxyResQueue = [];
        proxy = null;
    });

    return false;
};

const _normalizeUrl = (protocol, url, host) => {
    return new URL(url, `${protocol}://${host}`).href;
};

const proxyRequest = (req, res) => {
    const options = {
        method: req.method,
        headers: req.headers,
    };

    const protocol = req.socket.encrypted ? "https" : "http";
    const httpx = protocol === "https" ? https : http;
    const proxyReq = httpx.request(
        _normalizeUrl(protocol, req.url, req.headers.host),
        options,
        (targetRes) => {
            proxyResQueue.push({ req, targetRes, res });
        }
    );

    req.pipe(proxyReq, {
        end: true,
    });
};

const _convertRawHeadersToOutgoingHttpHeaders = (rawHeaders) => {
    headers = {};

    for (let i = 0; i < rawHeaders.length; i += 2) {
        headers[rawHeaders[i]] = rawHeaders[i + 1];
    }

    return headers;
};

const proxyRawRequest = (rawRequest, res) => {
    const options = {
        method: rawRequest.method,
        headers: _convertRawHeadersToOutgoingHttpHeaders(rawRequest.rawHeaders),
    };

    const httpx = rawRequest.absoluteUrl.startsWith("https") ? https : http;
    const newUrl = new URL(rawRequest.url, rawRequest.absoluteUrl).href;
    const proxyReq = httpx.request(newUrl, options, (targetRes) => {
        proxyResQueue.push({ rawRequest, targetRes, res });
    });

    proxyReq.end(rawRequest.rawBody);
};

const proxyResponse = (targetRes, res) => {
    res.writeHead(targetRes.statusCode, targetRes.headers);
    targetRes.pipe(res, {
        end: true,
    });
};

const proxyRawResponse = (rawResponse, res) => {
    res.writeHead(
        rawResponse.statusCode,
        rawResponse.statusMessage,
        rawResponse.headers
    );

    res.end(rawResponse.rawBody);
};

const ProxyRawMessage = (msg, change, res) => {
    let rawMsg = { ...msg.rawMsg };
    if (msg.type === "response") {
        if (change) {
            if (change.httpVersion) {
                rawMsg.httpVersion = change.httpVersion;
            }

            if (change.statusCode) {
                rawMsg.statusCode = change.statusCode;
            }
            if (change.statusMessage) {
                rawMsg.statusMessage = change.statusMessage;
            }

            if (change.rawHeaders) {
                rawMsg.rawHeaders = change.rawHeaders;
            }

            if (change.rawBody) {
                rawMsg.rawBody = change.rawBody;
            }
        }

        proxyRawResponse(rawMsg, res);
    } else if (msg.type === "request") {
        if (change) {
            if (change.method) {
                rawMsg.method = change.method;
            }

            if (change.url) {
                rawMsg.url = change.url;
            }

            if (change.httpVersion) {
                rawMsg.httpVersion = change.httpVersion;
            }

            if (change.rawHeaders) {
                rawMsg.rawHeaders = change.rawHeaders;
            }

            if (change.rawBody) {
                rawMsg.rawBody = change.rawBody;
            }
        }

        proxyRawRequest(rawMsg, res);
    }
};

const interceptRequest = (req, res) => {
    const protocol = req.socket.encrypted ? "https" : "http";
    let body = [];
    req.on("data", (chunk) => {
        body.push(chunk);
    }).on("end", () => {
        body = Buffer.concat(body);
        interceptReqQueue.push({
            rawRequest: {
                method: req.method,
                url: req.url,
                absoluteUrl: _normalizeUrl(protocol, req.url, req.headers.host),
                httpVersion: req.httpVersion,
                rawHeaders: req.rawHeaders,
                rawBody: body,
                rawTrailers: req.rawTrailers,
            },
            res,
        });
    });
};

const interceptResponse = (targetRes, res) => {
    let body = [];
    targetRes
        .on("data", (chunk) => {
            body.push(chunk);
        })
        .on("end", () => {
            body = Buffer.concat(body);
            interceptResQueue.push({
                rawResponse: {
                    httpVersion: targetRes.httpVersion,
                    statusCode: targetRes.statusCode,
                    statusMessage: targetRes.statusMessage,
                    headers: targetRes.headers,
                    rawHeaders: targetRes.rawHeaders,
                    rawBody: body,
                    rawTrailers: targetRes.rawTrailers,
                },
                res,
            });
        });
};

const getNextInterceptedMessage = () => {
    if (
        proxy &&
        intercept &&
        (interceptResQueue.length > 0 || interceptReqQueue.length > 0)
    ) {
        if (interceptResQueue.length > 0) {
            const { rawResponse, res } = interceptResQueue.shift();
            interceptMsgQueue.push({
                msg: {
                    type: "response",
                    rawMsg: rawResponse,
                },
                res,
            });
        } else if (interceptReqQueue.length > 0) {
            const { rawRequest, res } = interceptReqQueue.shift();
            interceptMsgQueue.push({
                msg: {
                    type: "request",
                    rawMsg: rawRequest,
                },
                res,
            });
        }
    }

    if (proxy && intercept && interceptMsgQueue.length > 0) {
        global.show();
        return interceptMsgQueue[0].msg;
    }

    return { type: "none" };
};

const acceptNextInterceptedMessage = (value) => {
    if (proxy && intercept && interceptMsgQueue.length > 0) {
        const { msg, res } = interceptMsgQueue.shift();

        ProxyRawMessage(msg, value, res);
    } else {
        console.warn("No intercepted message to accept");
    }
};

const dropNextInterceptedMessage = () => {
    if (proxy && intercept && interceptMsgQueue.length > 0) {
        const { res } = interceptMsgQueue.shift();
        res.end();
    } else {
        console.warn("No intercepted message to drop");
    }
};

const watchQueue = () => {
    while (
        (interceptMsgQueue.length > 0 && !intercept) ||
        (interceptResQueue.length > 0 && !intercept) ||
        (interceptReqQueue.length > 0 && !intercept) ||
        proxyResQueue.length > 0 ||
        proxyReqQueue.length > 0
    ) {
        if (interceptMsgQueue.length > 0 && !intercept) {
            const { msg, res } = interceptMsgQueue.shift();
            ProxyRawMessage(msg, undefined, res);
        } else if (interceptResQueue.length > 0 && !intercept) {
            const { rawResponse, res } = interceptResQueue.shift();
            proxyRawResponse(rawResponse, res);
        } else if (interceptReqQueue.length > 0 && !intercept) {
            const { rawRequest, res } = interceptReqQueue.shift();
            proxyRawRequest(rawRequest, res);
        } else if (proxyResQueue.length > 0) {
            const { req, rawRequest, targetRes, res } = proxyResQueue.shift();
            const url = req ? req.url : rawRequest.url;
            console.log(new Date(), "[HTTP PROXY <-]:", url);
            if (intercept) {
                interceptResponse(targetRes, res);
            } else {
                proxyResponse(targetRes, res);
            }
        } else if (proxyReqQueue.length > 0) {
            const { req, res } = proxyReqQueue.shift();
            console.log(new Date(), "[HTTP PROXY ->]:", req.method, req.url);
            if (intercept) {
                interceptRequest(req, res);
            } else {
                proxyRequest(req, res);
            }
        }
    }

    setTimeout(watchQueue, 500);
};

const onIntercept = (enable) => {
    intercept = !!enable;
};

// #endregion

// #region IPC ----------------------------------------------------------------

ipcMain.handle("proxy:status", () => {
    if (proxy) {
        return proxy.address();
    }
});

ipcMain.handle("proxy:start", (event, address, port) => {
    return startProxy(address, port);
});

ipcMain.handle("proxy:stop", () => {
    return stopProxy();
});

ipcMain.handle("proxy:intercept:get", () => {
    return intercept;
});

ipcMain.handle("proxy:intercept", (event, enable) => {
    return onIntercept(enable);
});

ipcMain.handle("proxy:intercept:next", () => {
    return getNextInterceptedMessage();
});

ipcMain.handle("proxy:intercept:accept", (event, value) => {
    return acceptNextInterceptedMessage(value);
});

ipcMain.handle("proxy:intercept:drop", () => {
    return dropNextInterceptedMessage();
});

// #endregion

setTimeout(watchQueue, 1000);

module.exports = {
    startProxy,
    stopProxy,
};
