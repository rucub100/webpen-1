const { ipcMain } = require("electron");
const http = require("http");
const { URL } = require("url");

let proxy;

let intercept = false;
let proxyReqQueue = [];
let proxyResQueue = [];
let interceptReqQueue = [];
let interceptResQueue = [];

// #region Functions ----------------------------------------------------------

const startProxy = (address = "127.0.0.1", port = 8080) => {
    if (proxy) {
        return true;
    }

    proxy = http.createServer((req, res) => {
        proxyReqQueue.push({ req, res });
    });

    proxy
        .listen({ host: address, port }, () => {
            console.log("opened server(proxy) on ", proxy.address());
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

const _normalizeUrl = (url, host) => {
    return new URL(url, `http://${host}`).href;
};

const proxyRequest = (req, res) => {
    const options = {
        method: req.method,
        headers: req.headers,
    };

    const proxyReq = http.request(
        _normalizeUrl(req.url, req.headers.host),
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

    const proxyReq = http.request(
        rawRequest.absoluteUrl,
        options,
        (targetRes) => {
            proxyResQueue.push({ rawRequest, targetRes, res });
        }
    );

    proxyReq.end(rawRequest.body);
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

    res.end(rawResponse.body);
};

const interceptRequest = (req, res) => {
    let body = [];
    req.on("data", (chunk) => {
        body.push(chunk);
    }).on("end", () => {
        body = Buffer.concat(body).toString();
        interceptReqQueue.push({
            rawRequest: {
                method: req.method,
                url: req.url,
                absoluteUrl: _normalizeUrl(req.url, req.headers.host),
                httpVersion: req.httpVersion,
                rawHeaders: req.rawHeaders,
                body,
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
            // TODO encoding? e.g. body may be compressed (gzip)
            body = Buffer.concat(body).toString();
            interceptResQueue.push({
                rawResponse: {
                    httpVersion: targetRes.httpVersion,
                    statusCode: targetRes.statusCode,
                    statusMessage: targetRes.statusMessage,
                    headers: targetRes.headers,
                    rawHeaders: targetRes.rawHeaders,
                    body,
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
            return {
                type: "response",
                response: interceptResQueue[0].rawResponse,
            };
        } else if (interceptReqQueue.length > 0) {
            return {
                type: "request",
                request: interceptReqQueue[0].rawRequest,
            };
        }
    }

    return { type: "none" };
};

const acceptNextInterceptedMessage = (value) => {
    if (
        proxy &&
        intercept &&
        (interceptResQueue.length > 0 || interceptReqQueue.length > 0)
    ) {
        if (interceptResQueue.length > 0) {
            const { rawResponse, res } = interceptResQueue.shift();
            // TODO use the modified response (parse from monaco editor)
            proxyRawResponse(rawResponse, res);
        } else if (interceptReqQueue.length > 0) {
            const { rawRequest, res } = interceptReqQueue.shift();
            console.log(value);
            proxyRawRequest(rawRequest, res);
        }
    }
};

const dropNextInterceptedMessage = () => {
    if (
        proxy &&
        intercept &&
        (interceptResQueue.length > 0 || interceptReqQueue.length > 0)
    ) {
        if (interceptResQueue.length > 0) {
            const { rawResponse, res } = interceptResQueue.shift();
            res.end();
        } else if (interceptReqQueue.length > 0) {
            const { rawRequest, res } = interceptReqQueue.shift();
            res.end();
        }
    }
};

const watchQueue = () => {
    while (
        (interceptResQueue.length > 0 && !intercept) ||
        (interceptReqQueue.length > 0 && !intercept) ||
        proxyResQueue.length > 0 ||
        proxyReqQueue.length > 0
    ) {
        if (interceptResQueue.length > 0 && !intercept) {
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
